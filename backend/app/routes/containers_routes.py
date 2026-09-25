from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.auth import get_current_user
from app.docker_service import docker_service
from app.registry import registry_manager

router = APIRouter(prefix="/containers", tags=["containers"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_containers(current_user: str = Depends(get_current_user)):
    containers = docker_service.list_containers(all_containers=True)
    mapping = registry_manager.get_container_to_component_map()

    enriched_containers = []
    for c in containers:
        name = c["name"]
        meta = mapping.get(name, {
            "component_id": None,
            "component_name": None,
            "is_gaia": False,
            "is_auxiliary": False,
            "is_infrastructure": False
        })
        
        # Get live stats for running containers
        stats = None
        if c.get("raw_status") == "running":
            stats = docker_service.get_container_stats(name)

        enriched_containers.append({
            **c,
            "gaia_meta": meta,
            "stats": stats
        })

    return enriched_containers

@router.get("/{name_or_id}", response_model=Dict[str, Any])
async def get_container_details(name_or_id: str, current_user: str = Depends(get_current_user)):
    details = docker_service.get_container(name_or_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container '{name_or_id}' niet gevonden"
        )
    
    mapping = registry_manager.get_container_to_component_map()
    meta = mapping.get(details["name"], {
        "component_id": None,
        "component_name": None,
        "is_gaia": False,
        "is_auxiliary": False,
        "is_infrastructure": False
    })
    
    stats = docker_service.get_container_stats(name_or_id)
    
    return {
        **details,
        "gaia_meta": meta,
        "stats": stats
    }
