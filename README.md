# Cinema Damage Control Room

Indian cinema crisis & decision-intelligence platform. Tracks films, detects damage,
diagnoses why, recommends actions, and measures whether interventions worked —
**DETECT → ACT → MEASURE → LEARN**.

## Run it

```powershell
npm install
npm run dev      # website → http://localhost:5173/
npm run server   # live data API → http://localhost:3001 (second terminal)
npm run start    # both at once
npm run build    # production build (type-check + Vite)
npm run lint     # oxlint, must stay 0 errors
```

Without the backend the room runs in clearly-labelled **Simulation mode**; with it,
the header flips to **Live** and every measured panel switches to real feed data.

## Architecture

- `server.js` — Express 5 API + static host. Polls Google News RSS on a **5-minute
  cadence** (`/api/news?topic=`, `/api/trending`, `/api/box-office`, `/api/search`,
  `/api/article`, `/api/health`). Topic-parameterised, relevance-filtered, cached.
- `src/data/apiService.ts` — fetch layer + `computeLiveStats()` (sentiment share,
  hourly velocity, reach sums, 12 hourly buckets, headline term-mining).
- `src/data/damage.ts` — multi-film damage model, **isolated from UI** so real
  box-office/occupancy APIs can replace modelled entries later.
- `src/data/mockData.ts` — simulation dataset for offline demos.
- State (all local, no store library): `PhaseContext` (release phase),
  `ProjectContext` (tracked film), `RoomState` (intervention pressure + decay),
  `Toaster` (feedback). Route-level code splitting keeps the initial bundle small.

## Data provenance (shown in the UI, never hidden)

| Label | Meaning |
|---|---|
| LIVE | Measured from the RSS feed this session |
| MODELLED | Illustrative estimate, not industry data |
| SIMULATION | Offline demo dataset |
| ESTIMATED | Heuristic (reach tiers, keyword sentiment) |

Keyword sentiment covers English headlines; regional scripts read neutral.
Reach is estimated by outlet tier, not measured impressions.

## Deploy

- **GitHub Pages** (static, Simulation mode): push to `main` → `.github/workflows/deploy.yml`
  builds and deploys. Enable **Settings → Pages → Source: GitHub Actions**.
- **Full stack with live data** (e.g. Render free tier): connect the repo, it
  auto-detects `render.yaml` (`npm ci && npm run build` → `node server.js`).
  `PORT` env is honoured; `/api` is same-origin so no CORS setup is needed.
