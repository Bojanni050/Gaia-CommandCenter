# Gaia Server Control Center (v0.1)

Een centrale, web-based beheer- en monitoringinterface ontworpen voor Gaia op Ubuntu VPS.

Het **Gaia Server Control Center** stelt Gaia als autonoom concept centraal, met Docker en de host-services als onderliggende infrastructuur (geen generieke Portainer-kloon).

---

## Kernfunctionaliteiten (Milestone v0.1)

1. **Gaia Architectuurmatrix**:
   - Live status van alle Gaia-componenten (Core, Hermes, Hindsight, Chronicle, ReasonIQ/Cognition, IntentIQ, MCP, Web).
   - Onderscheid tussen **Gaia Components** (conceptueel) en **Infrastructuur** (Docker containers, databases, reverse proxies, volumes, netwerken).
2. **Health Monitoring & Latency**:
   - Continue asynchrone health checks van alle HTTP en Docker health endpoints met milliseconde-latenties en live payload inspectie.
3. **Systeembronnen & Docker Engine**:
   - Host CPU load, coreverdeling, RAM geheugenverbruik, NVMe/SSD schijfruimte en Docker daemon statistieken.
4. **Directe Webinterface Koppelingen**:
   - Directe links ("Open UI") naar de interfaces van componenten (Hermes Dashboard, Hindsight UI, Gaia Admin Panel, Chronicle Dashboard, Gaia Web).
5. **Realtime Container Logs**:
   - Geïntegreerde log-viewer met tailing (50 tot 1000 regels), timestamps, auto-scroll, tekstfiltering en klembord-kopieerfunctie.
6. **Veilige Authenticatie**:
   - Toegang beveiligd met beheerdersauthenticatie (JWT sessie & HTTP-only cookies).
   - Docker socket (`/var/run/docker.sock`) blijft strikt server-side en wordt nooit blootgesteld aan de browser.

---

## Architectuur & Netwerkoverzicht

```
[ Tailscale VPN ] (100.65.0.15)
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ Gaia Server Control Center (:8899)                     │
│                                                        │
│  ├── React 18 + Vite (Dark Calm Technical UI)          │
│  └── FastAPI Backend (Python 3.12)                     │
│       │                                                │
│       ├── /var/run/docker.sock (Read-only Docker API)  │
│       ├── Component Registry (registry.yaml)           │
│       └── Asynchronous Health Probes                   │
└───────┬──────────────────────────────────┬─────────────┘
        │                                  │
        ▼                                  ▼
[ Gaia Logical Components ]     [ Infrastructure Services ]
• Gaia API / Core (:8891)       • Public Ingress Caddy (:80/:443)
• Hermes Agent (:8642/:9119)    • gaia-hermes-proxy (:8643)
• Hindsight Memory (:8888)      • chronicle-db pgvector (:5434)
• Chronicle / PM2 (:4577)       • gaia-cognition-db (:5432)
• ReasonIQ Cognition (:8890)    • Docker Engine v29.7 / Host OS
• IntentIQ (Core integrated)
• Gaia Web Client (:8090)
```

---

## De Component Registry (`backend/registry.yaml`)

Alle Gaia-componenten worden gedeclareerd in `backend/registry.yaml`. Voorbeeld:

```yaml
components:
  - id: "core"
    name: "Gaia API / Core"
    category: "core"
    description: "Centraal zenuwstelsel: SOUL, Decision Engine en Response Engine"
    container: "gaia-api"
    health_endpoint: "http://100.65.0.15:8891/health"
    ui_url: "http://100.65.0.15:8891/admin"
    ui_label: "Open Gaia Admin"
    config_source: "/root/gaia/services/gaia-api/.env"
    configurable: true
```

---

## Lokale Ontwikkeling

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## Installatie & Deployment via GitHub

Het Control Center is volledig gecontaineriseerd via een multi-stage Dockerfile en draait met `network_mode: host`. Hierdoor kan de backend direct en met minimale overhead communiceren met de lokale Docker socket (`/var/run/docker.sock`), de health endpoints van Gaia op localhost en het Tailscale IP (`100.65.0.15:8899`).

### Vereisten op de Server

- Ubuntu VPS met Docker Engine & Docker Compose plugin geïnstalleerd
- Git
- Tailscale (aanbevolen voor veilige toegang tot poort `8899`)

---

### Eerste Installatie

Voer de volgende commando's uit op de VPS (bijvoorbeeld via SSH als root):

```bash
# 1. Navigeer naar /opt (of een gewenste directory)
cd /opt

# 2. Clone de repository vanaf GitHub
# Optie A: Via HTTPS (voor een private repository gebruik je een GitHub Personal Access Token als wachtwoord)
git clone https://github.com/Bojanni050/Gaia-CommandCenter.git gaia-control-center

# Optie B: Via SSH (als er een SSH deploy key aan het GitHub project is toegevoegd)
# git clone git@github.com:Bojanni050/Gaia-CommandCenter.git gaia-control-center

cd gaia-control-center

# 3. Maak het omgevingsbestand aan
cp .env.example .env

# 4. Stel een veilig beheerderswachtwoord en secret key in
nano .env
```

Voorbeeld `.env`:
```ini
ADMIN_USERNAME=admin
ADMIN_PASSWORD=jouw-veilige-wachtwoord
SECRET_KEY=willekeurige-lange-sleutel-voor-jwt
PORT=8899
TAILSCALE_HOST=100.65.0.15
```

```bash
# 5. Bouw en start de container in de achtergrond
docker compose up -d --build

# 6. Controleer de status en logs
docker compose ps
docker compose logs -f
```

Open vervolgens in je browser:
```text
http://100.65.0.15:8899
```

---

### Updaten naar een Nieuwere Versie via GitHub

Wanneer er wijzigingen zijn gepusht naar de GitHub repository:

```bash
cd /opt/gaia-control-center

# Haal de laatste commits op
git pull origin main

# Rebuild en herstart de container zonder downtime
docker compose up -d --build
```

---

### Handige Beheercommando's

```bash
# Logs bekijken
docker compose logs -f --tail=100

# Container herstarten
docker compose restart

# Container stoppen
docker compose down
```
