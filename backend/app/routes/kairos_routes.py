from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.kairos import KairosError, build_stats, filter_episodes, kairos

router = APIRouter(prefix="/kairos", tags=["kairos"])


@router.get("/episodes", response_model=Dict[str, Any])
async def list_kairos_episodes(
    q: Optional[str] = Query(default=None),
    primary_app: Optional[str] = Query(default=None),
    since: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=200, ge=1, le=2000),
    current_user: str = Depends(get_current_user),
):
    """Afgeleide narratieve episodes (Kairos) uit Cognition, nieuwste eerst.

    Gepagineerd: het volledige (gefilterde) totaal blijft bereikbaar via
    `page`, zodat de UI niet bij een vaste 500 episodes stopt.
    """
    try:
        rows = await kairos.fetch_episodes()
    except KairosError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    filtered = filter_episodes(rows, q=q, primary_app=primary_app, since=since)
    total = len(filtered)
    offset = (page - 1) * limit
    items = filtered[offset : offset + limit]
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": offset + len(items) < total,
    }


@router.get("/stats", response_model=Dict[str, Any])
async def kairos_stats(current_user: str = Depends(get_current_user)):
    """Aggregaat over de episodes: per app, bron-dekking en tijdvenster."""
    try:
        rows = await kairos.fetch_episodes()
    except KairosError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return build_stats(rows)
