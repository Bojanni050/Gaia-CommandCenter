from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.auth import get_current_user
from app.registry import registry_manager
from app.docker_service import docker_service
from app.health_checker import health_checker

router = APIRouter(prefix="/components", tags=["components"])

class ComponentUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    container: Optional[str] = None
    auxiliary_containers: Optional[List[str]] = None
    runtime: Optional[str] = None
    process_name: Optional[str] = None
    host_component: Optional[str] = None
    health_endpoint: Optional[str] = None
    health_auth_env: Optional[str] = None
    layer: Optional[str] = None
    epistemic: Optional[str] = None
    lifecycle: Optional[str] = None
    repo: Optional[str] = None
    v3_note: Optional[str] = None
    ui_url: Optional[str] = None
    ui_label: Optional[str] = None
    config_source: Optional[str] = None
    configurable: Optional[bool] = None

class ComponentCreateRequest(BaseModel):
    id: Optional[str] = None
    name: str
    category: str = "core"
    description: str = ""
    container: Optional[str] = None
    auxiliary_containers: Optional[List[str]] = None
    runtime: Optional[str] = None
    process_name: Optional[str] = None
    host_component: Optional[str] = None
    health_endpoint: Optional[str] = None
    health_auth_env: Optional[str] = None
    layer: Optional[str] = None
    epistemic: Optional[str] = None
    lifecycle: Optional[str] = None
    repo: Optional[str] = None
    v3_note: Optional[str] = None
    ui_url: Optional[str] = None
    ui_label: Optional[str] = None
    config_source: Optional[str] = None
    configurable: bool = False

class TestEndpointRequest(BaseModel):
    endpoint: str

@router.get("", response_model=List[Dict[str, Any]])
async def list_gaia_components(current_user: str = Depends(get_current_user)):
    return await registry_manager.get_enriched_components()

@router.post("/test-endpoint", response_model=Dict[str, Any])
async def test_endpoint(req: TestEndpointRequest, current_user: str = Depends(get_current_user)):
    """Test a health check endpoint directly and return live connectivity feedback."""
    return await health_checker.check_endpoint(req.endpoint)

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

@router.put("/{component_id}", response_model=Dict[str, Any])
async def update_gaia_component(
    component_id: str,
    req: ComponentUpdateRequest,
    current_user: str = Depends(get_current_user)
):
    """Update settings for an existing Gaia component."""
    # Filter out None values
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    
    updated = registry_manager.update_component_definition(component_id, updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Component '{component_id}' niet gevonden in registry"
        )
    
    # Invalidate cache for the endpoint if updated
    if "health_endpoint" in updates and updates["health_endpoint"]:
        health_checker._cache.pop(updates["health_endpoint"], None)
        
    enriched = await registry_manager.get_enriched_component(component_id)
    return enriched or updated

@router.post("", response_model=Dict[str, Any])
async def create_gaia_component(
    req: ComponentCreateRequest,
    current_user: str = Depends(get_current_user)
):
    """Register a new Gaia component in the registry."""
    comp_dict = req.model_dump()
    created = registry_manager.create_component_definition(comp_dict)
    comp_id = created.get("id")
    enriched = await registry_manager.get_enriched_component(comp_id)
    return enriched or created

@router.delete("/{component_id}")
async def delete_gaia_component(
    component_id: str,
    current_user: str = Depends(get_current_user)
):
    """Remove a Gaia component from the registry."""
    success = registry_manager.delete_component_definition(component_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Component '{component_id}' niet gevonden"
        )
    return {"message": f"Component '{component_id}' succesvol verwijderd"}

@router.post("/reload")
async def reload_registry(current_user: str = Depends(get_current_user)):
    registry_manager.reload()
    return {"message": "Registry succesvol herladen"}
