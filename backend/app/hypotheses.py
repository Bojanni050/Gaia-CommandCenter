"""Hypothesen — leest de Cognition-service (lifecycle-eigenaar).

services/cognition bezit de *afgeleide* kennis in Gaia Cloud: hypotheses,
patronen en kandidaat-mental-models, elk met hun lifecycle
(proposed -> testing -> corroborated -> confirmed | rejected). Cognition
redeneert niet: Logos vormt en beoordeelt, Hindsight spiegelt voor recall.
Deze module maakt die bron read-only leesbaar voor het Control Center,
zonder de data te dupliceren of te bewerken.

Bron-endpoint: GET {COGNITION_URL}/v1/banks/{COGNITION_BANK_ID}/hypotheses
(geen auth; Tailscale-gebonden, net als Hindsight).
"""

import time
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

# Cognition levert de volledige lijst; het Control Center toont een begrensd venster.
COGNITION_LIMIT_CAP = 1000

# Korte cache: het dashboard vraagt lijst + stats apart op tijdens het pollen.
_CACHE_TTL_SECONDS = 5.0


class CognitionError(Exception):
    """De Cognition-service kon niet worden gelezen."""


class CognitionClient:
    """Dunne read-only client op Cognition's /v1/banks/:bank_id/hypotheses."""

    def __init__(self) -> None:
        self._cache: Dict[str, Any] = {"ts": 0.0, "key": None, "objects": []}

    @property
    def base_url(self) -> str:
        url = settings.COGNITION_URL or f"http://{settings.TAILSCALE_HOST}:8890"
        return url.rstrip("/")

    @property
    def bank_id(self) -> str:
        return settings.COGNITION_BANK_ID or "gaia"

    async def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(
                timeout=settings.COGNITION_HTTP_TIMEOUT_SECONDS, follow_redirects=True
            ) as client:
                resp = await client.get(url, headers={"Accept": "application/json"}, params=params)
        except httpx.HTTPError as exc:
            raise CognitionError(
                f"Cognition onbereikbaar op {self.base_url}: {exc}"
            ) from exc

        if resp.status_code >= 400:
            raise CognitionError(
                f"Cognition gaf HTTP {resp.status_code} terug op {path}."
            )
        try:
            return resp.json()
        except ValueError as exc:
            raise CognitionError("Cognition gaf geen geldige JSON terug.") from exc

    async def fetch_hypotheses(
        self,
        status: Optional[str] = None,
        kind: Optional[str] = None,
        force: bool = False,
    ) -> List[Dict[str, Any]]:
        """Haal de afgeleide statements op (Cognition sorteert op updated_at, nieuwste eerst)."""
        key = f"{status or ''}|{kind or ''}"
        now = time.monotonic()
        if (
            not force
            and self._cache["objects"]
            and self._cache["key"] == key
            and (now - self._cache["ts"] < _CACHE_TTL_SECONDS)
        ):
            return self._cache["objects"]

        params: Dict[str, Any] = {}
        if status:
            params["status"] = status
        if kind:
            params["kind"] = kind

        data = await self._get(
            f"/v1/banks/{self.bank_id}/hypotheses", params=params or None
        )
        if isinstance(data, dict):
            rows = data.get("hypotheses") or []
        elif isinstance(data, list):
            rows = data
        else:
            rows = []
        rows = [r for r in rows if isinstance(r, dict)]

        self._cache = {"ts": now, "key": key, "objects": rows}
        return rows


def filter_hypotheses(
    rows: List[Dict[str, Any]],
    *,
    status: Optional[str] = None,
    kind: Optional[str] = None,
    q: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Filter de (nieuwste-eerst) statements; status/kind zijn al server-side gefetcht."""
    needle = q.lower() if q else None

    results: List[Dict[str, Any]] = []
    for r in rows:
        if status and r.get("status") != status:
            continue
        if kind and r.get("kind") != kind:
            continue
        if needle:
            hay = (
                f"{r.get('statement', '')} {r.get('verification_plan', '') or ''} "
                f"{' '.join(r.get('sources') or [])} {r.get('rejection_reason', '') or ''}"
            ).lower()
            if needle not in hay:
                continue
        results.append(r)
        if limit is not None and len(results) >= limit:
            break
    return results


def build_stats(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregaat over alle opgehaalde statements: per status, kind en verwerp_bron."""
    by_status: Dict[str, int] = {}
    by_kind: Dict[str, int] = {}
    by_verwerp_bron: Dict[str, int] = {}
    confidence_sum = 0.0
    confidence_n = 0

    for r in rows:
        status = r.get("status") or "onbekend"
        by_status[status] = by_status.get(status, 0) + 1
        kind = r.get("kind") or "hypothesis"
        by_kind[kind] = by_kind.get(kind, 0) + 1
        bron = r.get("verwerp_bron")
        if bron:
            by_verwerp_bron[bron] = by_verwerp_bron.get(bron, 0) + 1
        confidence = r.get("confidence")
        if isinstance(confidence, (int, float)):
            confidence_sum += confidence
            confidence_n += 1

    return {
        "total": len(rows),
        "by_status": by_status,
        "by_kind": by_kind,
        "by_verwerp_bron": by_verwerp_bron,
        "avg_confidence": round(confidence_sum / confidence_n, 3) if confidence_n else None,
        "proposed": by_status.get("proposed", 0),
        "testing": by_status.get("testing", 0),
        "corroborated": by_status.get("corroborated", 0),
        "confirmed": by_status.get("confirmed", 0),
        "rejected": by_status.get("rejected", 0),
        "statuses": sorted(by_status.keys()),
        "kinds": sorted(by_kind.keys()),
    }


cognition = CognitionClient()
