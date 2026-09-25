from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.auth import get_current_user
from app.system_metrics import get_system_metrics
from app.docker_service import docker_service

router = APIRouter(prefix="/system", tags=["system"])

@router.get("", response_model=Dict[str, Any])
async def get_system_overview(current_user: str = Depends(get_current_user)):
    metrics = get_system_metrics()
    docker_info = docker_service.get_info()
    
    return {
        **metrics,
        "docker": docker_info
    }
