from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List
from app.auth import get_current_user
from app.docker_service import docker_service
from app.log_analyzer import log_analyzer

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("/analyze", response_model=Dict[str, Any])
async def analyze_all_logs(
    tail: int = Query(default=250, ge=50, le=2000),
    current_user: str = Depends(get_current_user)
):
    """Analyze logs across all running Gaia containers to detect potential issues and errors."""
    return log_analyzer.analyze_all_containers(tail=tail)

@router.get("/analyze/{name_or_id}", response_model=List[Dict[str, Any]])
async def analyze_container_logs(
    name_or_id: str,
    tail: int = Query(default=250, ge=50, le=2000),
    current_user: str = Depends(get_current_user)
):
    """Analyze logs for a specific container to detect issues."""
    return log_analyzer.analyze_container_logs(name_or_id, tail=tail)

@router.get("/{name_or_id}", response_model=Dict[str, Any])
async def get_container_logs(
    name_or_id: str,
    tail: int = Query(default=150, ge=10, le=2000),
    timestamps: bool = Query(default=True),
    current_user: str = Depends(get_current_user)
):
    logs_content = docker_service.get_container_logs(name_or_id, tail=tail, timestamps=timestamps)
    return {
        "container": name_or_id,
        "tail": tail,
        "timestamps": timestamps,
        "logs": logs_content
    }
