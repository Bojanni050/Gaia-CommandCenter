import time
import os
import platform
import psutil
from datetime import datetime, timezone
from typing import Dict, Any

def get_system_uptime() -> Dict[str, Any]:
    boot_time = psutil.boot_time()
    uptime_seconds = int(time.time() - boot_time)
    
    days = uptime_seconds // 86400
    hours = (uptime_seconds % 86400) // 3600
    minutes = (uptime_seconds % 3600) // 60
    
    formatted = []
    if days > 0:
        formatted.append(f"{days}d")
    if hours > 0 or days > 0:
        formatted.append(f"{hours}h")
    formatted.append(f"{minutes}m")
    
    return {
        "uptime_seconds": uptime_seconds,
        "formatted": " ".join(formatted),
        "boot_time": datetime.fromtimestamp(boot_time, tz=timezone.utc).isoformat()
    }

def get_system_metrics() -> Dict[str, Any]:
    # CPU
    cpu_percent = psutil.cpu_percent(interval=None)
    per_cpu = psutil.cpu_percent(percpu=True, interval=None)
    
    try:
        load_avg = os.getloadavg()
    except (AttributeError, OSError):
        load_avg = [0.0, 0.0, 0.0]

    # Memory
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()

    # Disk
    disk_path = "/" if os.name != "nt" else "C:\\"
    disk = psutil.disk_usage(disk_path)

    # Uptime
    uptime = get_system_uptime()

    return {
        "cpu": {
            "percent": round(cpu_percent, 1),
            "per_cpu": per_cpu,
            "core_count": psutil.cpu_count(logical=True),
            "physical_core_count": psutil.cpu_count(logical=False),
            "load_average": [round(x, 2) for x in load_avg]
        },
        "memory": {
            "total": mem.total,
            "used": mem.used,
            "available": mem.available,
            "percent": round(mem.percent, 1),
            "swap_total": swap.total,
            "swap_used": swap.used,
            "swap_percent": round(swap.percent, 1)
        },
        "disk": {
            "path": disk_path,
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": round(disk.percent, 1)
        },
        "uptime": uptime,
        "host": {
            "hostname": platform.node(),
            "os": platform.system(),
            "release": platform.release(),
            "architecture": platform.machine()
        }
    }
