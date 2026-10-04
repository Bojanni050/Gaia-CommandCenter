from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.hypotheses import (
    CognitionError,
    build_stats,
    cognition,
    filter_hypotheses,
)

router = APIRouter(prefix="/hypotheses", tags=["hypotheses"])


@router.get("", response_model=List[Dict[str, Any]])
async def list_hypotheses(
    status: Optional[str] = Query(default=None),
    kind: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=500, ge=1, le=1000),
    current_user: str = Depends(get_current_user),
):
    """Afgeleide statements (hypothesen/mental models/relaties) uit Cognition, nieuwste eerst."""
    try:
        rows = await cognition.fetch_hypotheses(status=status, kind=kind)
    except CognitionError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return filter_hypotheses(rows, status=status, kind=kind, q=q, limit=limit)


@router.get("/stats", response_model=Dict[str, Any])
async def hypotheses_stats(current_user: str = Depends(get_current_user)):
    """Aggregaat over alle afgeleide statements: per status, kind, verwerp_bron en gemiddelde confidence."""
    try:
        rows = await cognition.fetch_hypotheses()
    except CognitionError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return build_stats(rows)
