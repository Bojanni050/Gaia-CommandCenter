import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "Gaia Server Control Center"
    VERSION: str = "0.2.0"
    DEBUG: bool = False
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "gaia-control-center-secret-key-change-me-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "gaia2026")
    ENABLE_AUTH: bool = True
    
    # Paths & Sockets
    REGISTRY_PATH: str = os.getenv("REGISTRY_PATH", str(BASE_DIR / "registry.yaml"))
    DOCKER_SOCKET_PATH: str = os.getenv("DOCKER_SOCKET_PATH", "/var/run/docker.sock")
    
    # Probing & Health
    HEALTH_CHECK_TIMEOUT_SECONDS: float = 3.0
    HEALTH_CHECK_INTERVAL_SECONDS: int = 15
    
    # Tailscale Host IP
    TAILSCALE_HOST: str = os.getenv("TAILSCALE_HOST", "100.65.0.15")

    # Ingestie-log — de bron is de Ingestie Gateway van Foundation (Chronicle).
    # GET /api/ingest-logs toont wat capture-rs en andere clients hebben aangeleverd
    # en of de ingest-brug het al tot episode heeft verwerkt.
    FOUNDATION_API_URL: str = os.getenv(
        "FOUNDATION_API_URL", f"http://{os.getenv('TAILSCALE_HOST', '100.65.0.15')}:4577"
    )
    FOUNDATION_API_TOKEN: str = os.getenv("FOUNDATION_API_TOKEN", "")
    FOUNDATION_HTTP_TIMEOUT_SECONDS: float = float(os.getenv("FOUNDATION_HTTP_TIMEOUT_SECONDS", "5"))

    # Hypothesen — de bron is de Cognition-service (lifecycle-eigenaar, interim).
    # GET /api/hypotheses toont de afgeleide statements die Logos vormde en
    # Cognition administreert: proposed -> testing -> corroborated -> confirmed/rejected.
    # Cognition is Tailscale-gebonden en kent geen auth (net als Hindsight).
    COGNITION_URL: str = os.getenv(
        "COGNITION_URL", f"http://{os.getenv('TAILSCALE_HOST', '100.65.0.15')}:8890"
    )
    COGNITION_BANK_ID: str = os.getenv("COGNITION_BANK_ID", "gaia")
    COGNITION_HTTP_TIMEOUT_SECONDS: float = float(os.getenv("COGNITION_HTTP_TIMEOUT_SECONDS", "5"))

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
