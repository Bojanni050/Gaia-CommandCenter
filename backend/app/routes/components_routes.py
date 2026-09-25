from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.auth import get_current_user
from app.registry import registry_manager
from app.docker_service import docker_service

router = APIRouter(prefix="/components", tags=["components"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_gaia_components(current_user: str = Depends(get_current_user)):
    return await registry_manager.get_enriched_components()

@router.get("/{component_id}", response_model=Dict[str, Any])
async def get_gaia_component(component_id: str, current_user: str = Depends(get_current_user)):
    comp = await registry_manager.get_enriched_component(component_id)
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Component '{component_id}' niet gevonden in registry"
        )
    
    # Also fetch recent logs if container exists
    c_name = comp.get("container")
    recent_logs = ""
    if c_name:
        recent_logs = docker_service.get_container_logs(c_name, tail=50)

    return {
        **comp,
        "recent_logs": recent_logs
    }

@router.post("/reload")
async def reload_registry(current_user: str = Depends(get_current_user)):
    registry_manager.reload()
    return {"message": "Registry succesvol herladen"}
