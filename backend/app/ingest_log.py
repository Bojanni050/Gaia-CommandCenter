import json
import os
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config import settings


class IngestLogStore:
    """Append-only store voor ingestie-events van capture-rs (en andere clients)."""

    def __init__(self):
        self._lock = threading.Lock()
        self._entries: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        path = settings.INGEST_LOG_PATH
        if not os.path.exists(path):
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        self._entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
            self._entries = self._entries[-settings.INGEST_LOG_MAX_ENTRIES:]
        except Exception:
            self._entries = []

    def append(
        self,
        event: str,
        status: str,
        summary: str = "",
        source: str = "capture-rs",
        level: str = "info",
        payload: Optional[Dict[str, Any]] = None,
        client: Optional[str] = None,
    ) -> Dict[str, Any]:
        entry = {
            "id": uuid.uuid4().hex,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": source,
            "event": event,
            "status": status,
            "level": level,
            "summary": summary,
            "client": client,
            "payload": payload or {},
        }
        with self._lock:
            self._entries.append(entry)
            if len(self._entries) > settings.INGEST_LOG_MAX_ENTRIES:
                self._entries = self._entries[-settings.INGEST_LOG_MAX_ENTRIES:]
            self._flush_locked()
        return entry

    def _flush_locked(self):
        path = settings.INGEST_LOG_PATH
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                for e in self._entries[-settings.INGEST_LOG_MAX_ENTRIES:]:
                    f.write(json.dumps(e, ensure_ascii=False) + "\n")
        except Exception:
            pass

    def query(
        self,
        source: Optional[str] = None,
        event: Optional[str] = None,
        status: Optional[str] = None,
        level: Optional[str] = None,
        q: Optional[str] = None,
        since_hours: Optional[float] = None,
        limit: int = 200,
    ) -> List[Dict[str, Any]]:
        since_ts = None
        if since_hours and since_hours > 0:
            since_ts = time.time() - since_hours * 3600

        with self._lock:
            entries = list(self._entries)

        results = []
        for e in reversed(entries):
            if source and e.get("source") != source:
                continue
            if event and e.get("event") != event:
                continue
            if status and e.get("status") != status:
                continue
            if level and e.get("level") != level:
                continue
            if since_ts:
                try:
                    ts = datetime.fromisoformat(e["timestamp"]).timestamp()
                except Exception:
                    ts = 0
                if ts < since_ts:
                    continue
            if q:
                hay = f"{e.get('summary', '')} {e.get('event', '')} {e.get('client') or ''} {json.dumps(e.get('payload', {}), ensure_ascii=False)}".lower()
                if q.lower() not in hay:
                    continue
            results.append(e)
            if len(results) >= limit:
                break
        return results

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            entries = list(self._entries)

        by_status: Dict[str, int] = {}
        by_source: Dict[str, int] = {}
        by_event: Dict[str, int] = {}
        by_level: Dict[str, int] = {}
        for e in entries:
            by_status[e.get("status", "unknown")] = by_status.get(e.get("status", "unknown"), 0) + 1
            by_source[e.get("source", "unknown")] = by_source.get(e.get("source", "unknown"), 0) + 1
            by_event[e.get("event", "unknown")] = by_event.get(e.get("event", "unknown"), 0) + 1
            by_level[e.get("level", "info")] = by_level.get(e.get("level", "info"), 0) + 1

        total = len(entries)
        failed = by_status.get("error", 0) + by_status.get("failed", 0) + by_status.get("rejected", 0)
        window = 24 * 3600
        now = time.time()
        last_24h = 0
        for e in entries:
            try:
                if now - datetime.fromisoformat(e["timestamp"]).timestamp() <= window:
                    last_24h += 1
            except Exception:
                continue

        return {
            "total_events": total,
            "events_last_24h": last_24h,
            "failed_events": failed,
            "error_rate": round((failed / total * 100), 1) if total else 0.0,
            "by_status": by_status,
            "by_source": by_source,
            "by_event": by_event,
            "by_level": by_level,
            "last_event": entries[-1] if entries else None,
            "sources": sorted(by_source.keys()),
            "events": sorted(by_event.keys()),
        }


    def apply_gateway_payload(self, payload: Any) -> Dict[str, Any]:
        """Importeer events uit een Ingestie Gateway-response (list of {events: [...]}).

        Accepteert flexibele veldnamen (timestamp/time/created_at, event/type,
        status, summary/message, payload/data, client, source, level) en
        dedupliseert op id of (timestamp, event, summary).
        """
        if isinstance(payload, dict):
            items = (
                payload.get("events")
                or payload.get("items")
                or payload.get("logs")
                or payload.get("data")
                or []
            )
        elif isinstance(payload, list):
            items = payload
        else:
            items = []

        if not isinstance(items, list):
            return {"imported": 0, "skipped": 0, "total": 0}

        with self._lock:
            existing_ids = {e.get("id") for e in self._entries}
            existing_keys = {
                (e.get("timestamp"), e.get("event"), e.get("summary"))
                for e in self._entries
            }

        imported = 0
        skipped = 0
        for item in items:
            if not isinstance(item, dict):
                skipped += 1
                continue
            entry_id = item.get("id") or uuid.uuid4().hex
            timestamp = (
                item.get("timestamp")
                or item.get("time")
                or item.get("created_at")
                or item.get("date")
                or datetime.now(timezone.utc).isoformat()
            )
            event = item.get("event") or item.get("type") or "ingest"
            status = str(item.get("status") or item.get("result") or "ok").lower()
            summary = item.get("summary") or item.get("message") or ""
            key = (timestamp, event, summary)
            if entry_id in existing_ids or key in existing_keys:
                skipped += 1
                continue
            entry = {
                "id": entry_id,
                "timestamp": timestamp,
                "source": item.get("source") or "capture-rs",
                "event": event,
                "status": status,
                "level": item.get("level") or ("error" if status in ("failed", "error") else "info"),
                "summary": summary,
                "client": item.get("client") or item.get("device") or None,
                "payload": item.get("payload") or item.get("data") or {},
            }
            with self._lock:
                self._entries.append(entry)
                if len(self._entries) > settings.INGEST_LOG_MAX_ENTRIES:
                    self._entries = self._entries[-settings.INGEST_LOG_MAX_ENTRIES:]
                self._flush_locked()
            existing_ids.add(entry_id)
            existing_keys.add(key)
            imported += 1

        return {"imported": imported, "skipped": skipped, "total": len(items)}


ingest_log_store = IngestLogStore()
