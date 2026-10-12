from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.kairos import KairosError, build_stats, filter_episodes, kairos

router = APIRouter(prefix="/kairos", tags=["kairos"])


@router.get("/episodes", response_model=List[Dict[str, Any]])
async def list_kairos_episodes(
    q: Optional[str] = Query(default=None),
    primary_app: Optional[str] = Query(default=None),
    since: Optional[str] = Query(default=None),
    limit: int = Query(default=500, ge=1, le=500),
    current_user: str = Depends(get_current_user),
):
    """Afgeleide narratieve episodes (Kairos) uit Cognition, nieuwste eerst."""
    try:
        rows = await kairos.fetch_episodes()
    except KairosError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return filter_episodes(rows, q=q, primary_app=primary_app, since=since, limit=limit)


@router.get("/stats", response_model=Dict[str, Any])
async def kairos_stats(current_user: str = Depends(get_current_user)):
    """Aggregaat over de episodes: per app, bron-dekking en tijdvenster."""
    try:
        rows = await kairos.fetch_episodes()
    except KairosError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return build_stats(rows)
