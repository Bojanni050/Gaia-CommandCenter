import asyncio
import re
import time
import yaml
import os
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from app.config import settings
from app.docker_service import docker_service
from app.health_checker import health_checker
from app.ingest_log import FoundationIngestError, foundation_ingest

logger = logging.getLogger("registry")

# Standaardvenster waarbinnen een feed-gebaseerd component "actief" is.
DEFAULT_FRESHNESS_WINDOW_SECONDS = 900.0


def _parse_epoch(value: Optional[str]) -> Optional[float]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError):
        return None


async def _foundation_feed_activity(match_field: str, match_value: Any) -> Tuple[Optional[str], Optional[float]]:
    """Nieuwste (timestamp, leeftijd in s) van een rij in de Foundation-feed.

    Client-componenten zoals capture-rs draaien achter NAT en zijn niet
    inbound bereikbaar; hun liveness komt daarom uit de push-stroom naar
    Foundation in plaats van uit een HTTP-probe. (None, None) = nog nooit
    gezien. Gooit FoundationIngestError als Foundation onbereikbaar is.
    """
    objects = await foundation_ingest.fetch_objects()
    newest_epoch: Optional[float] = None
    newest_at: Optional[str] = None
    for obj in objects:
        if str(obj.get(match_field)) != str(match_value):
            continue
        ts = obj.get("updated_at") or obj.get("ingested_at")
        epoch = _parse_epoch(ts)
        if epoch is None:
            continue
        if newest_epoch is None or epoch > newest_epoch:
            newest_epoch, newest_at = epoch, ts
    if newest_epoch is None:
        return None, None
    return newest_at, max(0.0, time.time() - newest_epoch)

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

    def save_registry(self, raw_data: Dict[str, Any]):
        path = settings.REGISTRY_PATH
        try:
            with open(path, "w", encoding="utf-8") as f:
                yaml.safe_dump(raw_data, f, sort_keys=False, allow_unicode=True)
            self._raw_registry = raw_data
            logger.info(f"Registry saved successfully to {path}.")
        except Exception as e:
            logger.error(f"Failed to save registry to {path}: {e}")
            raise e

    def update_component_definition(self, component_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        components = self._raw_registry.get("components", [])
        found_idx = -1
        for idx, comp in enumerate(components):
            if comp.get("id") == component_id:
                found_idx = idx
                break

        if found_idx == -1:
            return None

        current = components[found_idx]
        for k, v in updates.items():
            if v is not None:
                current[k] = v

        components[found_idx] = current
        self._raw_registry["components"] = components
        self.save_registry(self._raw_registry)
        return current

    def create_component_definition(self, component: Dict[str, Any]) -> Dict[str, Any]:
        components = self._raw_registry.setdefault("components", [])
        comp_id = component.get("id")
        if not comp_id:
            comp_id = re.sub(r'[^a-zA-Z0-9_-]', '', component.get("name", "component").lower().replace(" ", "-"))
            component["id"] = comp_id

        existing = next((c for c in components if c.get("id") == comp_id), None)
        if existing:
            existing.update(component)
        else:
            components.append(component)

        self.save_registry(self._raw_registry)
        return component

    def delete_component_definition(self, component_id: str) -> bool:
        components = self._raw_registry.get("components", [])
        initial_len = len(components)
        components = [c for c in components if c.get("id") != component_id]
        if len(components) < initial_len:
            self._raw_registry["components"] = components
            self.save_registry(self._raw_registry)
            return True
        return False

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
        """Enriches static component definitions with live Docker stats and parallel health checks."""
        containers_list = docker_service.list_containers(all_containers=True)
        containers_by_name = {c["name"]: c for c in containers_list}
        all_stats = docker_service.get_all_container_stats()
        
        components_def = self._raw_registry.get("components", [])

        # Feed-gebaseerde componenten (client achter NAT): liveness uit de
        # Foundation-ingestiefeed i.p.v. een HTTP-probe of Docker-container.
        feed_activity: Dict[str, Dict[str, Any]] = {}
        for comp in components_def:
            if comp.get("status_source") != "foundation-feed":
                continue
            match = comp.get("status_match") or {}
            field = match.get("field") or "source"
            value = match.get("value", comp.get("id"))
            try:
                last_at, age = await _foundation_feed_activity(field, value)
                feed_activity[comp["id"]] = {"last_activity_at": last_at, "age_seconds": age}
            except FoundationIngestError as exc:
                feed_activity[comp["id"]] = {"error": str(exc)}

        # Gather all health checks concurrently (met optionele Bearer-auth per component)
        async def fetch_health(comp: Dict[str, Any]):
            endpoint = comp.get("health_endpoint")
            if not endpoint:
                return None
            headers = {}
            token_env = comp.get("health_auth_env")
            if token_env:
                token = os.getenv(token_env, "")
                if token:
                    headers["Authorization"] = f"Bearer {token}"
            try:
                return await health_checker.get_or_check(endpoint, custom_headers=headers or None)
            except Exception as e:
                return {
                    "endpoint": endpoint,
                    "status": "down",
                    "status_code": None,
                    "latency_ms": 0,
                    "response": None,
                    "error": str(e)
                }

        # Run all health checks in parallel
        results = await asyncio.gather(
            *[fetch_health(comp) for comp in components_def],
            return_exceptions=True
        )

        health_by_id = {}
        for comp, res in zip(components_def, results):
            if isinstance(res, dict):
                health_by_id[comp["id"]] = res

        enriched = []
        for comp in components_def:
            c_name = comp.get("container")
            c_data = containers_by_name.get(c_name) if c_name else None
            
            # Instant lookup from cached stats
            stats = all_stats.get(c_name) if (c_name and c_data and c_data.get("raw_status") == "running") else None
            health_res = health_by_id.get(comp.get("id"))

            # Determine composite status
            composite_status = "unknown"
            status_detail: Optional[str] = None

            if comp.get("status_source") == "foundation-feed":
                fa = feed_activity.get(comp["id"]) or {}
                window = float(comp.get("freshness_window_seconds") or DEFAULT_FRESHNESS_WINDOW_SECONDS)
                age = fa.get("age_seconds")
                if fa.get("error"):
                    composite_status = "unknown"
                    status_detail = fa["error"]
                elif age is None:
                    # Nog nooit een rij gezien: eerlijk onbekend, niet rood.
                    composite_status = "unknown"
                    status_detail = "Nog geen activiteit in de Foundation-feed"
                elif age <= window:
                    composite_status = "running"
                else:
                    # Te oud om te onderscheiden of de client uit staat of
                    # gewoon idle is: onbekend, nooit valselijk "Gestopt".
                    composite_status = "unknown"
                    status_detail = f"Geen activiteit sinds {int(age // 60)} min"
            elif comp.get("lifecycle") == "planned":
                # V3-doelcomponent dat nog niet bestaat: nooit rood tonen
                composite_status = "unknown"
            elif comp.get("runtime") == "pm2":
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

            fa = feed_activity.get(comp["id"]) or {}
            enriched.append({
                **comp,
                "composite_status": composite_status,
                "container_info": c_data,
                "container_stats": stats,
                "health_check": health_res,
                "has_ui": bool(comp.get("ui_url")),
                "last_activity_at": fa.get("last_activity_at"),
                "activity_age_seconds": fa.get("age_seconds"),
                "status_detail": status_detail,
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
