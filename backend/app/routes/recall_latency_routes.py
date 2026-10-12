from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.recall_latency import HindsightMetricsError, recall_latency

router = APIRouter(prefix="/recall-latency", tags=["recall-latency"])


@router.get("", response_model=Dict[str, Any])
async def get_recall_latency(
    force: bool = Query(default=False),
    current_user: str = Depends(get_current_user),
):
    """Recall-latency-verdeling uit Hindsight's /metrics (percentielen + drempels + buckets)."""
    try:
        return await recall_latency.fetch(force=force)
    except HindsightMetricsError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
