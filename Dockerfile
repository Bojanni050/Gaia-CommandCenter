# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Python FastAPI Backend
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code & default registry
COPY backend/app/ ./app/
COPY backend/registry.yaml ./registry.yaml

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /build/dist ./dist

# Environment defaults
ENV PORT=8899 \
    DOCKER_SOCKET_PATH=/var/run/docker.sock \
    REGISTRY_PATH=/app/registry.yaml \
    PYTHONUNBUFFERED=1

EXPOSE 8899

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8899/api/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
