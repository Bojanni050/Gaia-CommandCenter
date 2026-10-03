from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.config import settings
from app.ingest_log import ingest_log_store

router = APIRouter(prefix="/ingest-logs", tags=["ingest-logs"])


class IngestEventCreate(BaseModel):
    event: str = Field(..., description="Eventtype, bijv. 'capture_frame' of 'ingest_batch'")
    status: str = Field(..., description="'ok' | 'failed' | 'rejected' | 'pending'")
    summary: str = ""
    source: str = "capture-rs"
    level: str = "info"
    payload: Optional[Dict[str, Any]] = None
    client: Optional[str] = None


@router.get("", response_model=List[Dict[str, Any]])
async def list_ingest_logs(
    source: Optional[str] = Query(default=None),
    event: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    level: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    since_hours: Optional[float] = Query(default=None, ge=0.0, le=8760.0),
    limit: int = Query(default=200, ge=1, le=5000),
    current_user: str = Depends(get_current_user),
):
    """Ingestie-log van capture-rs en andere clients, nieuwste eerst."""
    return ingest_log_store.query(
        source=source,
        event=event,
        status=status,
        level=level,
        q=q,
        since_hours=since_hours,
        limit=limit,
    )


@router.get("/stats", response_model=Dict[str, Any])
async def ingest_log_stats(current_user: str = Depends(get_current_user)):
    """Aggregaat over de ingestie-log: totalen, foutpercentage en per bron/event."""
    return ingest_log_store.stats()


@router.post("", response_model=Dict[str, Any])
async def create_ingest_event(
    req: IngestEventCreate,
    current_user: str = Depends(get_current_user),
):
    """Registreer een ingestie-event (handmatig of via gateway-koppeling)."""
    return ingest_log_store.append(
        event=req.event,
        status=req.status,
        summary=req.summary,
        source=req.source,
        level=req.level,
        payload=req.payload,
        client=req.client,
    )


@router.post("/sync-gateway", response_model=Dict[str, Any])
async def sync_ingest_gateway(current_user: str = Depends(get_current_user)):
    """Haal ingestie-events op uit de Ingestie Gateway (Foundation/Chronicle)
    en importeer ze in de ingestie-log. Dedupliseert automatisch.

    De gateway-URL en optionele Bearer-token (env-naam) worden gelezen uit de
    Foundation-componentdefinitie in de registry (health_endpoint-basis).
    """
    from app.registry import registry_manager

    comp = registry_manager.get_component_definition("foundation")
    base_url = None
    headers = {}
    if comp and comp.get("health_endpoint"):
        base_url = comp["health_endpoint"].rsplit("/api/settings/status", 1)[0].rstrip("/")
    if not base_url:
        base_url = f"http://{settings.TAILSCALE_HOST}:4577"

    token_env = comp.get("ingest_auth_env") if comp else None
    if token_env:
        import os
        token = os.getenv(token_env, "")
        if token:
            headers["Authorization"] = f"Bearer {token}"

    endpoints = [
        f"{base_url}/api/ingest/events",
        f"{base_url}/api/ingest/log",
        f"{base_url}/api/ingest",
    ]

    last_error: Optional[str] = None
    async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
        for url in endpoints:
            try:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    try:
                        payload = resp.json()
                    except Exception:
                        last_error = f"Non-JSON response van {url}"
                        continue
                    result = ingest_log_store.apply_gateway_payload(payload)
                    result["gateway_url"] = url
                    return result
                last_error = f"HTTP {resp.status_code} van {url}"
            except Exception as e:
                last_error = f"{url}: {e}"

    raise HTTPException(
        status_code=502,
        detail=f"Kon Ingestie Gateway niet uitlezen: {last_error}",
    )
