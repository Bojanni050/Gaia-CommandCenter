"""Ingestie-log — leest de Ingestie Gateway van Foundation (Chronicle).

Foundation is de enige epistemische bron: alles wat capture-rs en andere
clients aanleveren landt daar als `observation`, en de ingest-brug bevriest
het daarna tot een episode. Deze module maakt die bron leesbaar voor het
Control Center, zonder de data te dupliceren of te bewerken.

Bron-endpoint: GET {FOUNDATION_API_URL}/api/ingest-logs?limit=N (Bearer-auth).
"""

import json
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

# Foundation capt de lijst zelf op 500 rijen (routes/ingestLogs.js).
FOUNDATION_LIMIT_CAP = 500

# Korte cache: het dashboard pollt elke 15s en vraagt lijst + stats apart op.
_CACHE_TTL_SECONDS = 5.0


class FoundationIngestError(Exception):
    """De ingestie-log van Foundation kon niet worden opgehaald."""


class FoundationIngestClient:
    """Dunne read-only client op Foundation's GET /api/ingest-logs."""

    def __init__(self) -> None:
        self._cache: Dict[str, Any] = {"ts": 0.0, "objects": []}

    @property
    def base_url(self) -> str:
        url = settings.FOUNDATION_API_URL or f"http://{settings.TAILSCALE_HOST}:4577"
        return url.rstrip("/")

    def _headers(self) -> Dict[str, str]:
        headers = {"Accept": "application/json"}
        token = settings.FOUNDATION_API_TOKEN.strip()
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    async def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(
                timeout=settings.FOUNDATION_HTTP_TIMEOUT_SECONDS, follow_redirects=True
            ) as client:
                resp = await client.get(url, headers=self._headers(), params=params)
        except httpx.HTTPError as exc:
            raise FoundationIngestError(
                f"Foundation onbereikbaar op {self.base_url}: {exc}"
            ) from exc

        if resp.status_code in (401, 403):
            raise FoundationIngestError(
                "Foundation weigerde het verzoek (401/403) — stel FOUNDATION_API_TOKEN in."
            )
        if resp.status_code >= 400:
            raise FoundationIngestError(
                f"Foundation gaf HTTP {resp.status_code} terug op {path}."
            )
        try:
            return resp.json()
        except ValueError as exc:
            raise FoundationIngestError("Foundation gaf geen geldige JSON terug.") from exc

    async def fetch_objects(self, limit: int = FOUNDATION_LIMIT_CAP, force: bool = False) -> List[Dict[str, Any]]:
        """Haal de recentste ingest_object-rijen op (nieuwste eerst)."""
        now = time.monotonic()
        if (
            not force
            and self._cache["objects"]
            and (now - self._cache["ts"] < _CACHE_TTL_SECONDS)
        ):
            return self._cache["objects"]

        capped = max(1, min(int(limit), FOUNDATION_LIMIT_CAP))
        data = await self._get("/api/ingest-logs", params={"limit": capped})
        if isinstance(data, dict):
            objects = data.get("objects") or []
        elif isinstance(data, list):
            objects = data
        else:
            objects = []
        objects = [o for o in objects if isinstance(o, dict)]

        self._cache = {"ts": now, "objects": objects}
        return objects


def map_object(obj: Dict[str, Any]) -> Dict[str, Any]:
    """Vertaal een Foundation ingest_object naar het IngestEvent-formaat.

    Hergebruikt bewust de bestaande velden die de Ingestie-viewer al kent:
    - event  = object_type (capture/chat/document/diary)
    - status = 'ok' zodra de brug er een episode van maakte, anders 'pending'
    """
    processed_at = obj.get("memory_processed_at")
    summary = obj.get("title") or obj.get("url") or ""
    return {
        "id": obj.get("id"),
        "timestamp": obj.get("ingested_at"),
        "source": obj.get("source") or "onbekend",
        "event": obj.get("object_type") or "onbekend",
        "status": "ok" if processed_at else "pending",
        "level": "info",
        "summary": summary,
        "client": obj.get("source_provider"),
        "payload": {
            "object_type": obj.get("object_type"),
            "url": obj.get("url"),
            "provider_conversation_id": obj.get("provider_conversation_id"),
            "occurred_at": obj.get("occurred_at"),
            "memory_processed_at": processed_at,
            "content_length": obj.get("content_length"),
            "has_turns": obj.get("has_turns"),
            "has_attachments": obj.get("has_attachments"),
            "tags": obj.get("tags"),
        },
    }


def _to_epoch(value: Optional[str]) -> float:
    if not value:
        return 0.0
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


def filter_events(
    events: List[Dict[str, Any]],
    *,
    source: Optional[str] = None,
    event: Optional[str] = None,
    status: Optional[str] = None,
    level: Optional[str] = None,
    q: Optional[str] = None,
    since_hours: Optional[float] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Filter de (nieuwste-eerst) events met dezelfde semantiek als de viewer."""
    since_ts = time.time() - since_hours * 3600 if since_hours and since_hours > 0 else None
    needle = q.lower() if q else None

    results: List[Dict[str, Any]] = []
    for e in events:
        if source and e.get("source") != source:
            continue
        if event and e.get("event") != event:
            continue
        if status and e.get("status") != status:
            continue
        if level and e.get("level") != level:
            continue
        if since_ts is not None and _to_epoch(e.get("timestamp")) < since_ts:
            continue
        if needle:
            hay = (
                f"{e.get('summary', '')} {e.get('event', '')} {e.get('client') or ''} "
                f"{json.dumps(e.get('payload', {}), ensure_ascii=False)}"
            ).lower()
            if needle not in hay:
                continue
        results.append(e)
        if limit is not None and len(results) >= limit:
            break
    return results


def build_stats(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregaat over het opgehaalde venster (max 500)."""
    by_status: Dict[str, int] = {}
    by_source: Dict[str, int] = {}
    by_event: Dict[str, int] = {}
    by_level: Dict[str, int] = {}

    window = 24 * 3600
    now = time.time()
    last_24h = 0

    for e in events:
        by_status[e.get("status", "onbekend")] = by_status.get(e.get("status", "onbekend"), 0) + 1
        by_source[e.get("source", "onbekend")] = by_source.get(e.get("source", "onbekend"), 0) + 1
        by_event[e.get("event", "onbekend")] = by_event.get(e.get("event", "onbekend"), 0) + 1
        by_level[e.get("level", "info")] = by_level.get(e.get("level", "info"), 0) + 1
        if now - _to_epoch(e.get("timestamp")) <= window:
            last_24h += 1

    total = len(events)
    failed = sum(by_status.get(s, 0) for s in ("failed", "rejected", "error"))
    pending = by_status.get("pending", 0)

    return {
        "total_events": total,
        "events_last_24h": last_24h,
        "failed_events": failed,
        "pending_events": pending,
        "error_rate": round((failed / total * 100), 1) if total else 0.0,
        "by_status": by_status,
        "by_source": by_source,
        "by_event": by_event,
        "by_level": by_level,
        "last_event": events[0] if events else None,
        "sources": sorted(by_source.keys()),
        "events": sorted(by_event.keys()),
    }


foundation_ingest = FoundationIngestClient()
