import time
from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List, Optional
from app.auth import get_current_user
from app.docker_service import docker_service
from app.log_analyzer import log_analyzer

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("/analyze", response_model=Dict[str, Any])
async def analyze_all_logs(
    tail: int = Query(default=20, ge=1, le=10000),
    since_hours: float = Query(default=25.0, ge=0.0, le=8760.0),
    current_user: str = Depends(get_current_user)
):
    """Analyze logs across all running Gaia containers to detect potential issues and errors."""
    return log_analyzer.analyze_all_containers(tail=tail, since_hours=since_hours)

@router.get("/analyze/{name_or_id}", response_model=List[Dict[str, Any]])
async def analyze_container_logs(
    name_or_id: str,
    tail: int = Query(default=20, ge=1, le=10000),
    since_hours: float = Query(default=25.0, ge=0.0, le=8760.0),
    current_user: str = Depends(get_current_user)
):
    """Analyze logs for a specific container to detect issues."""
    return log_analyzer.analyze_container_logs(name_or_id, tail=tail, since_hours=since_hours)

@router.get("/{name_or_id}", response_model=Dict[str, Any])
async def get_container_logs(
    name_or_id: str,
    tail: int = Query(default=20, ge=1, le=10000),
    since_hours: Optional[float] = Query(default=25.0, ge=0.0, le=8760.0),
    timestamps: bool = Query(default=True),
    current_user: str = Depends(get_current_user)
):
    since_timestamp = int(time.time() - (since_hours * 3600)) if since_hours and since_hours > 0 else None
    logs_content = docker_service.get_container_logs(
        name_or_id,
        tail=tail,
        timestamps=timestamps,
        since=since_timestamp
    )
    return {
        "container": name_or_id,
        "tail": tail,
        "since_hours": since_hours,
        "timestamps": timestamps,
        "logs": logs_content
    }
