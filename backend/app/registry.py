import yaml
import os
import logging
from typing import Dict, List, Any, Optional
from app.config import settings
from app.docker_service import docker_service
from app.health_checker import health_checker

logger = logging.getLogger("registry")

class RegistryManager:
    def __init__(self):
        self._raw_registry: Dict[str, Any] = {}
        self.reload()

    def reload(self):
        path = settings.REGISTRY_PATH
        if not os.path.exists(path):
            logger.warning(f"Registry file not found at {path}, using defaults.")
            self._raw_registry = {"components": [], "infrastructure": []}
            return

        try:
            with open(path, "r", encoding="utf-8") as f:
                self._raw_registry = yaml.safe_load(f) or {}
            logger.info(f"Loaded registry with {len(self._raw_registry.get('components', []))} components.")
        except Exception as e:
            logger.error(f"Failed to load registry from {path}: {e}")
            self._raw_registry = {"components": [], "infrastructure": []}

    def get_raw_registry(self) -> Dict[str, Any]:
        return self._raw_registry

    def get_component_definition(self, component_id: str) -> Optional[Dict[str, Any]]:
        for comp in self._raw_registry.get("components", []):
            if comp.get("id") == component_id:
                return comp
        return None

    def get_container_to_component_map(self) -> Dict[str, Dict[str, Any]]:
        """Maps container name -> { component_id, component_name, is_gaia, is_auxiliary }"""
        mapping = {}
        for comp in self._raw_registry.get("components", []):
            c_name = comp.get("container")
            if c_name:
                mapping[c_name] = {
                    "component_id": comp.get("id"),
                    "component_name": comp.get("name"),
                    "is_gaia": True,
                    "is_auxiliary": False
                }
            for aux in comp.get("auxiliary_containers", []):
                mapping[aux] = {
                    "component_id": comp.get("id"),
                    "component_name": f"{comp.get('name')} (Auxiliary)",
                    "is_gaia": True,
                    "is_auxiliary": True
                }

        for infra in self._raw_registry.get("infrastructure", []):
            c_name = infra.get("container")
            if c_name and c_name not in mapping:
                mapping[c_name] = {
                    "component_id": infra.get("id"),
                    "component_name": infra.get("name"),
                    "is_gaia": False,
                    "is_auxiliary": False,
                    "is_infrastructure": True
                }
        return mapping

    async def get_enriched_components(self) -> List[Dict[str, Any]]:
        """Enriches static component definitions with live Docker stats and health checks."""
        containers_list = docker_service.list_containers(all_containers=True)
        containers_by_name = {c["name"]: c for c in containers_list}
        
        enriched = []
        for comp in self._raw_registry.get("components", []):
            c_name = comp.get("container")
            c_data = containers_by_name.get(c_name) if c_name else None
            
            # Fetch container stats if container is running
            stats = None
            if c_name and c_data and c_data.get("raw_status") == "running":
                stats = docker_service.get_container_stats(c_name)

            # Health Check
            health_res = None
            endpoint = comp.get("health_endpoint")
            if endpoint:
                health_res = await health_checker.get_or_check(endpoint)

            # Determine composite status
            # Running, Stopped, Unhealthy, Starting, Unknown
            composite_status = "unknown"
            
            if comp.get("runtime") == "pm2":
                # Special handling for host processes like Chronicle
                if health_res and health_res.get("status") == "ok":
                    composite_status = "running"
                elif health_res and health_res.get("status") == "down":
                    composite_status = "stopped"
                else:
                    composite_status = "unknown"
            elif c_data:
                raw_st = c_data.get("raw_status")
                docker_health = c_data.get("health")
                
                if raw_st == "running":
                    if docker_health == "unhealthy":
                        composite_status = "unhealthy"
                    elif docker_health == "starting":
                        composite_status = "starting"
                    elif health_res and health_res.get("status") == "down":
                        # Docker says running, but HTTP endpoint is unreachable
                        composite_status = "unhealthy"
                    else:
                        composite_status = "running"
                elif raw_st in ["exited", "stopped", "dead"]:
                    composite_status = "stopped"
                else:
                    composite_status = raw_st
            elif comp.get("host_component"):
                # Sub-component like IntentIQ (hosted in Core)
                composite_status = "running" if (health_res and health_res.get("status") == "ok") else "ok"
            else:
                composite_status = "stopped"

            enriched.append({
                **comp,
                "composite_status": composite_status,
                "container_info": c_data,
                "container_stats": stats,
                "health_check": health_res,
                "has_ui": bool(comp.get("ui_url")),
            })
            
        return enriched

    async def get_enriched_component(self, component_id: str) -> Optional[Dict[str, Any]]:
        components = await self.get_enriched_components()
        for c in components:
            if c.get("id") == component_id:
                return c
        return None

    def get_infrastructure(self) -> List[Dict[str, Any]]:
        containers_list = docker_service.list_containers(all_containers=True)
        containers_by_name = {c["name"]: c for c in containers_list}
        
        enriched_infra = []
        for infra in self._raw_registry.get("infrastructure", []):
            c_name = infra.get("container")
            c_data = containers_by_name.get(c_name)
            enriched_infra.append({
                **infra,
                "container_info": c_data
            })
        return enriched_infra

registry_manager = RegistryManager()
