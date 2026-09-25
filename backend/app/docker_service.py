import os
import re
import logging
from typing import Dict, List, Optional, Any
import docker
from docker.errors import DockerException, NotFound

from app.config import settings

logger = logging.getLogger("docker_service")

# Keys whose values should be masked in environment outputs
SENSITIVE_KEY_PATTERNS = [
    r"token",
    r"secret",
    r"password",
    r"key",
    r"auth",
    r"private",
]

def mask_sensitive_value(key: str, val: str) -> str:
    key_lower = key.lower()
    for pattern in SENSITIVE_KEY_PATTERNS:
        if re.search(pattern, key_lower):
            if len(val) > 8:
                return f"{val[:3]}...{val[-3:]}"
            return "******"
    return val

class DockerService:
    def __init__(self):
        self._client: Optional[docker.DockerClient] = None
        self._init_client()

    def _init_client(self):
        try:
            if os.path.exists(settings.DOCKER_SOCKET_PATH):
                self._client = docker.DockerClient(base_url=f"unix://{settings.DOCKER_SOCKET_PATH}")
            else:
                # Fallback to default from_env (e.g. for local dev or remote docker)
                self._client = docker.from_env()
            # Test ping
            self._client.ping()
            logger.info("Docker daemon successfully connected.")
        except Exception as e:
            logger.warning(f"Could not connect to Docker daemon: {e}")
            self._client = None

    @property
    def is_available(self) -> bool:
        if not self._client:
            self._init_client()
        if not self._client:
            return False
        try:
            return self._client.ping()
        except Exception:
            return False

    def get_info(self) -> Dict[str, Any]:
        if not self.is_available:
            return {
                "available": False,
                "error": "Docker socket not reachable",
                "containers_total": 0,
                "containers_running": 0,
                "containers_stopped": 0,
                "server_version": "N/A"
            }
        try:
            info = self._client.info()
            version = self._client.version()
            return {
                "available": True,
                "server_version": version.get("Version", "Unknown"),
                "api_version": version.get("ApiVersion", "Unknown"),
                "containers_total": info.get("Containers", 0),
                "containers_running": info.get("ContainersRunning", 0),
                "containers_paused": info.get("ContainersPaused", 0),
                "containers_stopped": info.get("ContainersStopped", 0),
                "images_count": info.get("Images", 0),
                "operating_system": info.get("OperatingSystem", "Unknown"),
                "ncpu": info.get("NCPU", 0),
                "mem_total": info.get("MemTotal", 0)
            }
        except Exception as e:
            logger.error(f"Error fetching docker info: {e}")
            return {"available": False, "error": str(e)}

    def list_containers(self, all_containers: bool = True) -> List[Dict[str, Any]]:
        if not self.is_available:
            return []
        try:
            containers = self._client.containers.list(all=all_containers)
            result = []
            for c in containers:
                attrs = c.attrs
                state = attrs.get("State", {})
                status_str = state.get("Status", "unknown")
                health_str = state.get("Health", {}).get("Status") if "Health" in state else None
                
                # Determine unified status
                # running, stopped, unhealthy, starting, unknown
                display_status = status_str
                if health_str:
                    if health_str == "unhealthy":
                        display_status = "unhealthy"
                    elif health_str == "starting":
                        display_status = "starting"

                # Parse ports
                ports = []
                port_bindings = attrs.get("NetworkSettings", {}).get("Ports", {})
                for container_port, host_maps in (port_bindings or {}).items():
                    if host_maps:
                        for h in host_maps:
                            host_ip = h.get("HostIp", "0.0.0.0")
                            host_port = h.get("HostPort", "")
                            ports.append(f"{host_ip}:{host_port}->{container_port}")
                    else:
                        ports.append(container_port)

                # Name without leading slash
                name = c.name.lstrip("/")

                result.append({
                    "id": c.id[:12],
                    "full_id": c.id,
                    "name": name,
                    "image": attrs.get("Config", {}).get("Image", ""),
                    "status": display_status,
                    "raw_status": attrs.get("State", {}).get("Status", ""),
                    "health": health_str,
                    "created": attrs.get("Created", ""),
                    "started_at": state.get("StartedAt", ""),
                    "ports": ports,
                    "restart_policy": attrs.get("HostConfig", {}).get("RestartPolicy", {}).get("Name", "")
                })
            return result
        except Exception as e:
            logger.error(f"Error listing containers: {e}")
            return []

    def get_container(self, name_or_id: str) -> Optional[Dict[str, Any]]:
        if not self.is_available:
            return None
        try:
            c = self._client.containers.get(name_or_id)
            attrs = c.attrs
            state = attrs.get("State", {})
            config = attrs.get("Config", {})
            
            # Mask environment variables
            env_vars = []
            for item in config.get("Env", []):
                if "=" in item:
                    k, v = item.split("=", 1)
                    env_vars.append(f"{k}={mask_sensitive_value(k, v)}")
                else:
                    env_vars.append(item)

            return {
                "id": c.id[:12],
                "full_id": c.id,
                "name": c.name.lstrip("/"),
                "image": config.get("Image", ""),
                "state": state,
                "status": state.get("Status", "unknown"),
                "health": state.get("Health", {}).get("Status") if "Health" in state else None,
                "created": attrs.get("Created", ""),
                "started_at": state.get("StartedAt", ""),
                "finished_at": state.get("FinishedAt", ""),
                "restart_policy": attrs.get("HostConfig", {}).get("RestartPolicy", {}),
                "mounts": [
                    {
                        "source": m.get("Source"),
                        "destination": m.get("Destination"),
                        "mode": m.get("Mode"),
                        "rw": m.get("RW"),
                    }
                    for m in attrs.get("Mounts", [])
                ],
                "networks": list(attrs.get("NetworkSettings", {}).get("Networks", {}).keys()),
                "env": env_vars,
            }
        except NotFound:
            return None
        except Exception as e:
            logger.error(f"Error fetching container {name_or_id}: {e}")
            return None

    def get_container_stats(self, name_or_id: str) -> Dict[str, Any]:
        """Fetch instantaneous CPU and RAM metrics for a container."""
        if not self.is_available:
            return {"cpu_percent": 0.0, "memory_usage": 0, "memory_limit": 0, "memory_percent": 0.0}
        try:
            c = self._client.containers.get(name_or_id)
            # stream=False returns a single snapshot dict
            stats = c.stats(stream=False)
            
            # CPU calculation
            cpu_stats = stats.get("cpu_stats", {})
            precpu_stats = stats.get("precpu_stats", {})
            
            cpu_delta = cpu_stats.get("cpu_usage", {}).get("total_usage", 0) - precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
            system_delta = cpu_stats.get("system_cpu_usage", 0) - precpu_stats.get("system_cpu_usage", 0)
            online_cpus = cpu_stats.get("online_cpus", len(cpu_stats.get("cpu_usage", {}).get("percpu_usage", []) or [1]))
            
            cpu_percent = 0.0
            if system_delta > 0.0 and cpu_delta > 0.0:
                cpu_percent = (cpu_delta / system_delta) * online_cpus * 100.0

            # Memory calculation
            mem_stats = stats.get("memory_stats", {})
            mem_usage = mem_stats.get("usage", 0)
            # Docker includes cache in usage on Linux cgroup v1/v2, adjust if inactive_file exists
            stats_dict = mem_stats.get("stats", {})
            if "inactive_file" in stats_dict:
                mem_usage = max(0, mem_usage - stats_dict["inactive_file"])
            elif "total_inactive_file" in stats_dict:
                mem_usage = max(0, mem_usage - stats_dict["total_inactive_file"])
                
            mem_limit = mem_stats.get("limit", 1)
            mem_percent = (mem_usage / mem_limit) * 100.0 if mem_limit > 0 else 0.0

            # Network I/O
            networks = stats.get("networks", {})
            rx_bytes = sum(net.get("rx_bytes", 0) for net in networks.values())
            tx_bytes = sum(net.get("tx_bytes", 0) for net in networks.values())

            return {
                "cpu_percent": round(cpu_percent, 2),
                "memory_usage": mem_usage,
                "memory_limit": mem_limit,
                "memory_percent": round(mem_percent, 2),
                "net_rx_bytes": rx_bytes,
                "net_tx_bytes": tx_bytes
            }
        except Exception as e:
            return {
                "cpu_percent": 0.0,
                "memory_usage": 0,
                "memory_limit": 0,
                "memory_percent": 0.0,
                "error": str(e)
            }

    def get_container_logs(self, name_or_id: str, tail: int = 100, timestamps: bool = False) -> str:
        if not self.is_available:
            return "Docker daemon niet bereikbaar."
        try:
            c = self._client.containers.get(name_or_id)
            logs = c.logs(tail=tail, timestamps=timestamps, stdout=True, stderr=True)
            return logs.decode("utf-8", errors="replace")
        except NotFound:
            return f"Container '{name_or_id}' niet gevonden."
        except Exception as e:
            return f"Fout bij ophalen logs: {str(e)}"

docker_service = DockerService()
