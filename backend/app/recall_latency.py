"""Recall-latency — leest Hindsight's Prometheus `/metrics`.

Hindsight meet elke HTTP-call in een histogram (`hindsight_http_duration_seconds`).
Deze module leest de bucketreeks van het recall-endpoint
(`/v1/default/banks/{bank_id}/memories/recall`) en rekent die om naar
percentielen en drempeloverschrijdingen, zodat het Control Center de *staart*
kan tonen — niet alleen het gemiddelde.

Belangrijk: het histogram meet de duur van elke afgeronde recall, óók een
trage die pas na 5 s slaagt. Dat is precies de bron voor "aandeel boven 4 s" —
een foutenlog zou die mislukte noch trage-successen bevatten. Daarnaast splitst
deze module op `status_class`: de latency-statistiek gaat over de geslaagde
(2xx) recalls, en het faalaandeel (non-2xx) komt uit dezelfde reeks. Zo komen
"hoe traag" en "hoe vaak mislukt" uit één bron.

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


def _label(line: str, name: str) -> Optional[str]:
    m = re.search(rf'{name}="([^"]*)"', line)
    return m.group(1) if m else None


def parse_recall_histogram(text: str) -> Dict[str, Any]:
    """Pure parser: bouw percentielen + drempels + faalaandeel uit Hindsight's
    Prometheus-tekst.

    Leest alleen de serie(s) van het recall-endpoint. De latency-statistiek
    (buckets, count, sum) komt van `status_class="2xx"` — de geslaagde recalls,
    inclusief de trage; het aantal non-2xx komt uit dezelfde reeks als het
    faalaandeel. Geeft `available: False` terug als er nog geen metingen zijn.
    """
    buckets: Dict[float, float] = {}
    has_inf = False
    ok_count = 0.0
    ok_sum = 0.0
    failed_count = 0.0
    status_classes: set = set()

    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or not line.startswith(_METRIC):
            continue
        if _label(line, "endpoint") != RECALL_ENDPOINT:
            continue
        status = _label(line, "status_class") or "unknown"
        status_classes.add(status)
        try:
            value = float(line.rsplit(" ", 1)[-1])
        except ValueError:
            continue

        if line.startswith(f"{_METRIC}_bucket"):
            if status != "2xx":
                continue
            le = _label(line, "le")
            if le is None:
                continue
            if le == "+Inf":
                has_inf = True
                continue
            try:
                buckets[float(le)] = buckets.get(float(le), 0.0) + value
            except ValueError:
                continue
        elif line.startswith(f"{_METRIC}_count"):
            if status == "2xx":
                ok_count += value
            else:
                failed_count += value
        elif line.startswith(f"{_METRIC}_sum"):
            if status == "2xx":
                ok_sum += value

    total_attempts = int(round(ok_count + failed_count))
    failed = {
        "count": int(round(failed_count)),
        "percent": round(failed_count / total_attempts * 100, 1) if total_attempts else 0.0,
    }

    if ok_count <= 0:
        return {
            "available": total_attempts > 0,
            "source": "hindsight:/metrics",
            "endpoint": RECALL_ENDPOINT,
            "count": 0,
            "attempts": total_attempts,
            "failed": failed,
            "status_classes": sorted(status_classes),
            "note": ("Nog geen geslaagde recall-metingen sinds de laatste Hindsight-start."
                     if total_attempts == 0 else
                     "Alleen mislukte recall-pogingen sinds de laatste Hindsight-start."),
            "buckets": [],
            "percentiles_ms": {},
            "thresholds": {},
        }

    ordered = sorted(buckets.items())  # (le_seconds, cumulative_count)

    def percentile(q: float) -> Optional[float]:
        target = q * ok_count
        for le, cum in ordered:
            if cum >= target:
                return le
        return None

    def over(seconds: float) -> Dict[str, Any]:
        within = 0.0
        for le, cum in ordered:
            if le <= seconds:
                within = max(within, cum)
        n = ok_count - within
        return {"count": int(round(n)), "percent": round(n / ok_count * 100, 1)}

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
    if has_inf:
        bucket_rows.append({
            "le_seconds": None,
            "le_label": "+Inf",
            "cumulative": int(round(ok_count)),
            "count": int(round(ok_count - prev)),
        })

    def to_ms(v: Optional[float]) -> Optional[int]:
        return int(round(v * 1000)) if v is not None else None

    return {
        "available": True,
        "source": "hindsight:/metrics",
        "endpoint": RECALL_ENDPOINT,
        "count": int(round(ok_count)),
        "attempts": total_attempts,
        "failed": failed,
        "status_classes": sorted(status_classes),
        "sum_seconds": round(ok_sum, 3),
        "mean_ms": to_ms(ok_sum / ok_count) if ok_count else None,
        "percentiles_ms": {
            "p50": to_ms(percentile(0.50)),
            "p90": to_ms(percentile(0.90)),
            "p95": to_ms(percentile(0.95)),
            "p99": to_ms(percentile(0.99)),
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
