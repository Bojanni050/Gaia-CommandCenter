import time
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import httpx

from app.config import settings

logger = logging.getLogger("health_checker")

class HealthChecker:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def check_endpoint(self, endpoint_url: str, custom_headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Check a single HTTP health endpoint with timeout and latency recording."""
        start_time = time.perf_counter()
        headers = custom_headers or {}
        
        try:
            async with httpx.AsyncClient(timeout=2.0, follow_redirects=True) as client:
                resp = await client.get(endpoint_url, headers=headers)
                latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
                
                # Check status
                is_ok = (200 <= resp.status_code < 300)
                
                preview = None
                try:
                    preview = resp.json()
                except Exception:
                    preview = resp.text[:200] if resp.text else None

                result = {
                    "endpoint": endpoint_url,
                    "status": "ok" if is_ok else "degraded",
                    "status_code": resp.status_code,
                    "latency_ms": latency_ms,
                    "response": preview,
                    "error": None if is_ok else f"HTTP Status {resp.status_code}",
                    "last_checked": datetime.now(timezone.utc).isoformat()
                }
                return result
        except httpx.TimeoutException:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
            return {
                "endpoint": endpoint_url,
                "status": "down",
                "status_code": None,
                "latency_ms": latency_ms,
                "response": None,
                "error": "Timeout (endpoint reageerde niet binnen limiet)",
                "last_checked": datetime.now(timezone.utc).isoformat()
            }
        except httpx.ConnectError as e:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
            return {
                "endpoint": endpoint_url,
                "status": "down",
                "status_code": None,
                "latency_ms": latency_ms,
                "response": None,
                "error": f"Connectiefout: kan endpoint niet bereiken ({e})",
                "last_checked": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
            return {
                "endpoint": endpoint_url,
                "status": "down",
                "status_code": None,
                "latency_ms": latency_ms,
                "response": None,
                "error": str(e),
                "last_checked": datetime.now(timezone.utc).isoformat()
            }

    async def get_or_check(self, endpoint_url: str, force: bool = False, custom_headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        now = time.time()
        cached = self._cache.get(endpoint_url)
        
        # Cache for 10 seconds unless forced
        if not force and cached and (now - cached.get("_timestamp", 0) < 10):
            return cached.get("data")

        data = await self.check_endpoint(endpoint_url, custom_headers)
        self._cache[endpoint_url] = {
            "_timestamp": time.time(),
            "data": data
        }
        return data

health_checker = HealthChecker()
