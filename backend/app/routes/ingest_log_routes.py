from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.auth import get_current_user
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
