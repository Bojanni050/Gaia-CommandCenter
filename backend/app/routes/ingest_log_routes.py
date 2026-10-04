from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.ingest_log import (
    FoundationIngestError,
    build_stats,
    filter_events,
    foundation_ingest,
    map_object,
)

router = APIRouter(prefix="/ingest-logs", tags=["ingest-logs"])


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
    """Ingestie-log van Foundation (capture-rs en andere clients), nieuwste eerst."""
    try:
        objects = await foundation_ingest.fetch_objects()
    except FoundationIngestError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    events = [map_object(o) for o in objects]
    return filter_events(
        events,
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
    """Aggregaat over de ingestie-log van Foundation: totalen, foutpercentage en per bron/event."""
    try:
        objects = await foundation_ingest.fetch_objects()
    except FoundationIngestError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return build_stats([map_object(o) for o in objects])
