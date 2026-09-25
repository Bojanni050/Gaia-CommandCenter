from fastapi import APIRouter, Depends, Query
from typing import Dict, Any
from app.auth import get_current_user
from app.docker_service import docker_service

router = APIRouter(prefix="/logs", tags=["logs"])

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
