import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.routes import (
    auth_routes,
    system_routes,
    components_routes,
    containers_routes,
    logs_routes
)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Centrale beheer- en monitoringinterface voor Gaia Server en Docker services"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_routes.router, prefix="/api")
app.include_router(system_routes.router, prefix="/api")
app.include_router(components_routes.router, prefix="/api")
app.include_router(containers_routes.router, prefix="/api")
app.include_router(logs_routes.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.VERSION
    }

# Static files and frontend SPA fallback
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "dist"
if not FRONTEND_DIST.exists():
    # Also check parent directory for local dev build
    FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't hijack /api routes
        if full_path.startswith("api"):
            return {"error": "API route not found"}
        
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    async def root_placeholder():
        return {
            "service": settings.APP_NAME,
            "version": settings.VERSION,
            "status": "online",
            "message": "API is active. Frontend build not yet populated in dist/."
        }
