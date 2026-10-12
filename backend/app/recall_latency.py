"""Recall-latency — leest Hindsight's Prometheus `/metrics`.

Hindsight meet elke HTTP-call in een histogram (`hindsight_http_duration_seconds`).
Deze module leest de bucketreeks van het recall-endpoint
(`/v1/default/banks/{bank_id}/memories/recall`) en rekent die om naar
percentielen en drempeloverschrijdingen, zodat het Control Center de *staart*
kan tonen — niet alleen het gemiddelde.

Hindsight is Tailscale-gebonden en kent geen auth (net als Cognition/Foundation).
Het histogram is cumulatief over de levensduur van het Hindsight-proces: een
herstart zet de reeks op nul. Dat staat er expliciet bij in de UI.
"""

import re
import time
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

# Het endpoint-label dat Hindsight op de histogram zet.
RECALL_ENDPOINT = "/v1/default/banks/{bank_id}/memories/recall"

# Drempels die we expliciet uitlichten (seconden).
THRESHOLDS = (4.0, 8.0)

_CACHE_TTL_SECONDS = 5.0

_METRIC = "hindsight_http_duration_seconds"


class HindsightMetricsError(Exception):
    """Hindsight's /metrics kon niet worden gelezen."""


def _parse_label_value(line: str, label: str) -> Optional[str]:
    m = re.search(rf'{label}="([^"]*)"', line)
    return m.group(1) if m else None


def parse_recall_histogram(text: str) -> Dict[str, Any]:
    """Pure parser: bouw percentielen + drempels uit Hindsight's Prometheus-tekst.

    Leest alleen de serie(s) van het recall-endpoint en telt die op (Hindsight
    kan meerdere series hebben, bv. per statusklasse). Geeft `available: False`
    terug als er nog geen recall-metingen zijn.
    """
    buckets: Dict[float, float] = {}
    has_inf = False
    total_count = 0.0
    total_sum = 0.0
    other_endpoints: set = set()

    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or not line.startswith(_METRIC):
            continue
        endpoint = _parse_label_value(line, "endpoint")
        if endpoint is not None and endpoint != RECALL_ENDPOINT:
            other_endpoints.add(endpoint)

        try:
            value = float(line.rsplit(" ", 1)[-1])
        except ValueError:
            continue

        if line.startswith(f"{_METRIC}_bucket") and endpoint == RECALL_ENDPOINT:
            le = _parse_label_value(line, "le")
            if le is None:
                continue
            if le == "+Inf":
                has_inf = True
                continue
            try:
                buckets[float(le)] = buckets.get(float(le), 0.0) + value
            except ValueError:
                continue
        elif line.startswith(f"{_METRIC}_count") and endpoint == RECALL_ENDPOINT:
            total_count += value
        elif line.startswith(f"{_METRIC}_sum") and endpoint == RECALL_ENDPOINT:
            total_sum += value

    if total_count <= 0:
        return {
            "available": False,
            "source": "hindsight:/metrics",
            "endpoint": RECALL_ENDPOINT,
            "count": 0,
            "note": "Nog geen recall-metingen sinds de laatste Hindsight-start.",
            "buckets": [],
            "percentiles_ms": {},
            "thresholds": {},
        }

    ordered = sorted(buckets.items())  # (le_seconds, cumulative_count)

    def percentile(q: float) -> Optional[float]:
        target = q * total_count
        for le, cum in ordered:
            if cum >= target:
                return le
        return None

    def over(seconds: float) -> Dict[str, Any]:
        # cumulatief t/m de kleinste bucket >= seconds is "binnen"; de rest is erover.
        within = 0.0
        for le, cum in ordered:
            if le <= seconds:
                within = max(within, cum)
        n = total_count - within
        return {"count": int(round(n)), "percent": round(n / total_count * 100, 1)}

    bucket_rows: List[Dict[str, Any]] = []
    prev = 0.0
    for le, cum in ordered:
        bucket_rows.append({
            "le_seconds": le,
            "le_label": ("%g" % le),
            "cumulative": int(round(cum)),
            "count": int(round(cum - prev)),
        })
        prev = cum
    # +Inf-vangnet (metingen boven de hoogste bucket)
    if has_inf:
        bucket_rows.append({
            "le_seconds": None,
            "le_label": "+Inf",
            "cumulative": int(round(total_count)),
            "count": int(round(total_count - prev)),
        })

    p50 = percentile(0.50)
    p90 = percentile(0.90)
    p95 = percentile(0.95)
    p99 = percentile(0.99)

    return {
        "available": True,
        "source": "hindsight:/metrics",
        "endpoint": RECALL_ENDPOINT,
        "count": int(round(total_count)),
        "sum_seconds": round(total_sum, 3),
        "mean_ms": int(round(total_sum / total_count * 1000)) if total_count else None,
        "percentiles_ms": {
            "p50": int(round(p50 * 1000)) if p50 is not None else None,
            "p90": int(round(p90 * 1000)) if p90 is not None else None,
            "p95": int(round(p95 * 1000)) if p95 is not None else None,
            "p99": int(round(p99 * 1000)) if p99 is not None else None,
        },
        "thresholds": {f"{int(s)}s" if s.is_integer() else f"{s}s": over(s) for s in THRESHOLDS},
        "buckets": bucket_rows,
        "bucket_count": len(bucket_rows),
    }


class RecallLatencyClient:
    """Dunne read-only client op Hindsight's /metrics, met korte cache."""

    def __init__(self) -> None:
        self._cache: Dict[str, Any] = {"ts": 0.0, "data": None}

    @property
    def metrics_url(self) -> str:
        base = settings.HINDSIGHT_URL or f"http://{settings.TAILSCALE_HOST}:8888"
        return f"{base.rstrip('/')}/metrics"

    async def fetch(self, force: bool = False) -> Dict[str, Any]:
        now = time.monotonic()
        if not force and self._cache["data"] is not None and (now - self._cache["ts"] < _CACHE_TTL_SECONDS):
            return self._cache["data"]

        try:
            async with httpx.AsyncClient(timeout=settings.HINDSIGHT_HTTP_TIMEOUT_SECONDS) as client:
                resp = await client.get(self.metrics_url, headers={"Accept": "text/plain"})
        except httpx.HTTPError as exc:
            raise HindsightMetricsError(f"Hindsight onbereikbaar op {self.metrics_url}: {exc}") from exc

        if resp.status_code >= 400:
            raise HindsightMetricsError(f"Hindsight gaf HTTP {resp.status_code} terug op /metrics.")

        data = parse_recall_histogram(resp.text)
        data["scraped_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self._cache = {"ts": now, "data": data}
        return data


recall_latency = RecallLatencyClient()
