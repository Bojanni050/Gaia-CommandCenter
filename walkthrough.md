# Walkthrough — Gaia-CommandCenter

Chronologisch logboek van significante wijzigingen (oudste → nieuwste). Reden van
een keuze staat erbij, niet alleen wat er is gedaan.

## 2026-10-04 (Hypothesen-tab: Cognition-lifecycle read-only volgen)

- Findings: Bo wilde de hypothesen kunnen volgen vanuit het Control Center, analoog aan de Ingestie-tab. De bron bleek de Cognition-service (Gaia-Cloud `services/cognition`), die een volledige REST-API ontsluit op `:8890`; het Command Center had hiervoor nog geen route of tab. Het eigenaarschap van de lifecycle stond in `registry.yaml` nog als "open besluit" genoteerd, terwijl de code het inmiddels beslecht: Cognition bezit lifecycle/opslag, Logos vormt en beoordeelt, Hindsight spiegelt voor recall.
- Conclusions: Read-only bouwen (geen confirm/reject) — Cognition is de enige lifecycle-eigenaar en bevestigen blijft mens-only (Absolute Override). De backend proxyt server-side naar Cognition, zodat de browser `:8890` nooit ziet en er geen token nodig is (Cognition kent geen auth, Tailscale-gebonden). Zelfde patroon als Ingestie/Foundation: dunne client met korte cache, mapping, filter- en stats-functies. Bank-id is `gaia` (`COGNITION_BANK_ID`), niet de Hindsight-bank `bojan`.
- Actions: `backend/app/config.py` (`COGNITION_URL`, `COGNITION_BANK_ID`, `COGNITION_HTTP_TIMEOUT_SECONDS`); nieuw `backend/app/hypotheses.py` (client + `filter_hypotheses`/`build_stats`); nieuw `backend/app/routes/hypotheses_routes.py` (`GET /api/hypotheses`, `GET /api/hypotheses/stats`); `backend/app/main.py` (router geregistreerd); `frontend/src/types/index.ts` (`Hypothesis`, `HypothesisStats`); `frontend/src/services/api.ts` (`getHypotheses`, `getHypothesisStats`); nieuw `frontend/src/components/HypothesesPage.tsx`; `frontend/src/components/Navbar.tsx` + `frontend/src/App.tsx` (tab); `docker-compose.yml` (env); `README.md` (feature). Validated: `npm run build`, Python compile/import, live end-to-end test tegen `100.65.0.15:8890`, browsercontrole; daarna gedeployed en groen op de VPS.

## 2026-10-04 (Build-artefacten uit git + walkthrough-protocol)

- Findings: `.gitignore` had al `dist/` en `*.pyc`, maar de `.pyc`-bestanden en `dist/index.html` waren al getrackt vóórdat die regels er waren — ignore geldt niet voor al gevolgde bestanden, dus ze bleven in elke status opduiken. Ook ontbrak een `walkthrough.md`.
- Conclusions: Alleen untracken (`git rm --cached`), niet wissen — Docker bouwt `frontend/dist` zelf tijdens de image-build, dus de repo heeft de artefacten niet nodig. `.openchamber/` toegevoegd (screenshots van de browsertool). De workflow-padfilter `backend/**` trof de `.pyc`-verwijderingen en triggerde onbedoeld een deploy; daarom een exclude toegevoegd.
- Actions: `.gitignore` (`.openchamber/`); 16 artefacten untrackt (`.pyc`, `backend/dist/index.html`, `frontend/dist/index.html`); `.github/workflows/deploy.yml` (`!backend/**/__pycache__/**`); `walkthrough.md` aangemaakt. Validated: working tree schoon, deploy-run groen.
