# Gaia Server Control Center (v0.2)

Een centrale, web-based beheer- en monitoringinterface ontworpen voor Gaia op Ubuntu VPS.

Het **Gaia Server Control Center** stelt Gaia als autonoom concept centraal, met Docker en de host-services als onderliggende infrastructuur (geen generieke Portainer-kloon). Sinds v0.2 volgt de matrix de **V3-doelarchitectuur**: het harnas is Gaia (Gaia-Cloud), het model is vervangbaar.

---

## Kernfunctionaliteiten (v0.2)

1. **Gaia V3-architectuurmatrix**:
   - Live status gegroepeerd per laag: **Harnas** (Gaia API, Logos), **Geheugenpijp** (Foundation → Hindsight → Cognition), **Capabilities** (Hermes, MCP), **Clients** (Gaia Web, capture-rs gepland).
   - Epistemische badges per component (`observation` / `interpretation` / `hypothesis` / `agency` / `executie` / `presence`) en lifecycle (`active` / `interim` / `planned`).
   - Onderscheid tussen **Gaia Components** (conceptueel) en **Infrastructuur** (Docker containers, databases, reverse proxies, volumes, netwerken).
2. **Health Monitoring & Latency**:
   - Continue asynchrone health checks van alle HTTP en Docker health endpoints met milliseconde-latenties en live payload inspectie.
   - Optionele Bearer-auth per endpoint via `health_auth_env`; een `401/403` wordt als `auth` (goud) getoond in plaats van `down`.
3. **Systeembronnen & Docker Engine**:
   - Host CPU load, coreverdeling, RAM geheugenverbruik, NVMe/SSD schijfruimte en Docker daemon statistieken.
4. **Directe Webinterface Koppelingen**:
   - Directe links ("Open UI") naar de interfaces van componenten (Hermes Dashboard, Hindsight UI, Gaia Admin Panel, Chronicle Dashboard, Gaia Web).
5. **Ingestie-viewer (capture-rs)**:
   - Live lezing van de Ingestie Gateway van Foundation (Chronicle) via `GET /api/ingest-logs`: wat capture-rs en andere clients aanleveren, en of de ingest-brug het al tot episode verwerkte. Met filters op bron, eventtype, status en periode, plus aggregaatstatistiek (recent venster, 24u-volume, wachtend op brug, foutpercentage). Vereist `FOUNDATION_API_TOKEN`.
6. **Realtime Container Logs**:
   - Geïntegreerde log-viewer met tailing (50 tot 1000 regels), timestamps, auto-scroll, tekstfiltering en klembord-kopieerfunctie.
7. **Veilige Authenticatie**:
   - Toegang beveiligd met beheerdersauthenticatie (JWT sessie & HTTP-only cookies).
   - Docker socket (`/var/run/docker.sock`) blijft strikt server-side en wordt nooit blootgesteld aan de browser.

---

## Architectuur & Netwerkoverzicht (V3)

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
│       ├── Component Registry (registry.yaml, v2.0)     │
│       └── Asynchronous Health Probes (+Bearer/env)     │
└───────┬──────────────────────────────────┬─────────────┘
        │                                  │
        ▼                                  ▼
[ Gaia V3-matrix per laag ]     [ Infrastructure Services ]
• Harnas: Gaia API/Core (:8891) • Public Ingress Caddy (:80/:443)
  + Logos (reflectie, in Core)  • Foundation DB pgvector (:5434)
• Geheugenpijp:                 • gaia-cognition-db (:5432)
  Foundation (:4577, pm2)       • gaia-hermes-proxy (:8643)
  Hindsight (:8888)             • Docker Engine / Host OS
  Cognition (:8890, interim)
• Capabilities: Hermes (:8642/:9119), MCP (via Foundation)
• Clients: Gaia Web (:8090), capture-rs (gepland)
```

Geheugenpijp (eenrichting): `Foundation/Chronicle (observation) → Hindsight (interpretation/hypothesis) → Logos (beoordeling)`.
Alleen menselijke bevestiging promoveert naar `confirmed` (Absolute Override). IntentIQ & ReasonIQ zijn
gepensioneerd als losse lagen en opgegaan in Logos. Doelstructuur: 5 repositories
(`Gaia-Cloud`, `Foundation`, `capture-rs`, `gaia-desktop`, `gaia-web`).
Zie `Gaia-Cloud/docs/architecture-v3.md` (voorstel + open besluiten) en `Foundation/DEPLOYMENT.md`.

---

## De Component Registry (`backend/registry.yaml`, v2.0)

Alle Gaia-componenten worden gedeclareerd in `backend/registry.yaml`. Voorbeeld:

```yaml
components:
  - id: "core"
    name: "Gaia API / Core"
    category: "core"
    layer: "harnas"            # harnas | geheugenpijp | capabilities | clients
    epistemic: "agency"        # agency | observation | interpretation | hypothesis | execution | presence
    lifecycle: "active"        # active | interim | planned (planned → nooit rood)
    repo: "Gaia-Cloud (services/gaia-api)"
    description: "Het harnas: centrale agency, SOUL, turn-orchestratie en Response Engine"
    container: "gaia-api"
    health_endpoint: "http://100.65.0.15:8891/health"
    health_auth_env: "GAIA_API_TOKEN"  # optioneel: Bearer via env-var
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
# Optioneel: alleen nodig als een registry-component health_auth_env gebruikt
# GAIA_API_TOKEN=
# FOUNDATION_API_TOKEN=
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
