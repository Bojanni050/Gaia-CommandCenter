"""Kairos — leest de afgeleide narratieve episodes uit de Cognition-service.

services/cognition bezit de `kairos_episodes`-tabel: wat de Kairos-worker in
gaia-api uit de rauwe Foundation-observaties synthetiseerde. Elke episode is een
*interpretatie* (epistemic_status), geen rauw record, en draagt `sources` terug
naar de observaties waaruit hij is opgebouwd. Deze module maakt die bron
read-only leesbaar voor het Control Center.

De canonieke client-surface is `GET /kairos/episodes` op Gaia API; net als de
Hypothesen-tab leest het Control Center hier rechtstreeks Cognition (server-side
proxy, geen token; Cognition is Tailscale-gebonden), zodat de browser `:8890`
nooit ziet.

Bron-endpoint: GET {COGNITION_URL}/v1/banks/{COGNITION_BANK_ID}/episodes
(gepagineerd; Cognition kapt op 100 per pagina, dus deze client pagineert).
"""

import time
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

# Cognition kapt een pagina op 100; we pagineren tot deze bovengrens.
EPISODES_CAP = 500
PAGE_SIZE = 100

_CACHE_TTL_SECONDS = 5.0


class KairosError(Exception):
    """De Cognition-service kon niet worden gelezen."""


class KairosClient:
    """Dunne read-only client op Cognition's /v1/banks/:bank/episodes."""

    def __init__(self) -> None:
        self._cache: Dict[str, Any] = {"ts": 0.0, "objects": []}

    @property
    def base_url(self) -> str:
        url = settings.COGNITION_URL or f"http://{settings.TAILSCALE_HOST}:8890"
        return url.rstrip("/")

    @property
    def bank_id(self) -> str:
        return settings.COGNITION_BANK_ID or "gaia"

    async def _page(self, page: int) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/banks/{self.bank_id}/episodes"
        try:
            async with httpx.AsyncClient(
                timeout=settings.COGNITION_HTTP_TIMEOUT_SECONDS, follow_redirects=True
            ) as client:
                resp = await client.get(
                    url,
                    headers={"Accept": "application/json"},
                    params={"page": page, "limit": PAGE_SIZE},
                )
        except httpx.HTTPError as exc:
            raise KairosError(f"Cognition onbereikbaar op {self.base_url}: {exc}") from exc
        if resp.status_code >= 400:
            raise KairosError(f"Cognition gaf HTTP {resp.status_code} terug op /episodes.")
        try:
            return resp.json()
        except ValueError as exc:
            raise KairosError("Cognition gaf geen geldige JSON terug.") from exc

    async def fetch_episodes(self, force: bool = False) -> List[Dict[str, Any]]:
        """Alle episodes (nieuwste eerst), gepagineerd tot EPISODES_CAP."""
        now = time.monotonic()
        if not force and self._cache["objects"] and (now - self._cache["ts"] < _CACHE_TTL_SECONDS):
            return self._cache["objects"]

        collected: List[Dict[str, Any]] = []
        page = 1
        while len(collected) < EPISODES_CAP:
            body = await self._page(page)
            rows = body.get("data") if isinstance(body, dict) else None
            rows = [r for r in (rows or []) if isinstance(r, dict)]
            collected.extend(rows)
            pagination = body.get("pagination") or {}
            if not rows or not pagination.get("has_more"):
                break
            page += 1

        self._cache = {"ts": now, "objects": collected}
        return collected


def filter_episodes(
    rows: List[Dict[str, Any]],
    *,
    q: Optional[str] = None,
    primary_app: Optional[str] = None,
    since: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Filter de (nieuwste-eerst) episodes op app, periode en vrije tekst."""
    needle = q.lower() if q else None
    results: List[Dict[str, Any]] = []
    for r in rows:
        if primary_app and r.get("primary_app") != primary_app:
            continue
        if since and str(r.get("start_time") or "") < since:
            continue
        if needle:
            hay = (
                f"{r.get('summary', '')} {r.get('primary_app', '')} "
                f"{' '.join(r.get('involved_apps') or [])} {' '.join(r.get('sources') or [])}"
            ).lower()
            if needle not in hay:
                continue
        results.append(r)
        if limit is not None and len(results) >= limit:
            break
    return results


def build_stats(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregaat: per app, bron-dekking en het tijdvenster."""
    by_app: Dict[str, int] = {}
    with_sources = 0
    starts: List[str] = []
    for r in rows:
        app = r.get("primary_app") or "onbekend"
        by_app[app] = by_app.get(app, 0) + 1
        if r.get("sources"):
            with_sources += 1
        if r.get("start_time"):
            starts.append(str(r["start_time"]))
    starts.sort()
    return {
        "total": len(rows),
        "by_primary_app": by_app,
        "apps": sorted(by_app.keys()),
        "with_sources": with_sources,
        "without_sources": len(rows) - with_sources,
        "earliest": starts[0] if starts else None,
        "latest": starts[-1] if starts else None,
    }


kairos = KairosClient()
