# Dream Signal — Multimodal Dream Analysis Engine

Dream Signal is a cinematic, premium-grade dream intelligence application designed to record, transcribe, interpret, and visually map user dreams. It leverages a modern React frontend, a Node.js Express backend, and a specialized Python FastAPI AI microservice running local and API-driven ML models.

---

## System Architecture

```
                    +------------------------------------+
                    |         React SPA (Vite)           |
                    |         (Port 5173 / Dark UI)      |
                    +------------------+-----------------+
                                       |
                                       | HTTPS / JSON + SSE
                                       v
                    +------------------------------------+
                    |       Node.js Express Server       |
                    |         (Port 5001 Backend)        |
                    +------+----------------------+------+
                           |                      |
            Mongoose /     |                      | HTTP POST /
            JSON Schema    v                      v JSON / Multipart
               +-----------+----+          +------+-------------+
               | MongoDB Atlas  |          | Python FastAPI     |
               | / Local Server |          | (Port 8000 ML API) |
               +----------------+          +------+-------------+
                                                  |
                         +------------------------+------------------------+
                         |                        |                        |
                         v local                  v local                  v local (zero-shot
               +-----------------+      +-----------------+      +-----------------+
               | Faster-Whisper  |      | Sentence-       |      | Emotion & Symbol|
               | (Voice Transcr) |      | Transformers    |      | classifiers via |
               |                 |      | (embeddings +   |      | embedding sim   |
               |                 |      |  LRU cache)     |      |                 |
               +-----------------+      +-----------------+      +-----------------+
                                                  |
                                                  v Gemini API
                                        +-----------------+
                                        | gemini-2.5-flash|
                                        +-----------------+
```

---

## Features

- **Voice Signal Recording** — live audio capture in the browser with an interactive `CanvasWaveform` visualizer.
- **Whisper Transcription** — local high-speed transcription on the FastAPI microservice (`faster-whisper`, CPU int8 quantized).
- **Emotion Recognition** — local zero-shot classifier (cosine similarity between the transcript embedding and pre-embedded emotion prompts) over the same 7-emotion taxonomy as `j-hartmann/emotion-english-distilroberta-base`. Runs on the already-loaded sentence-transformer; no external API.
- **Symbol Extraction** — local zero-shot classifier scoring the transcript against ~50 archetypal Jungian symbols (configurable via `SYMBOL_LABELS`). Same approach as emotions; tunable threshold + top-k.
- **Subconscious Connection** — 384-dim dense vectors via `all-MiniLM-L6-v2` with an LRU cache and cosine similarity to surface related dreams.
- **Psychoanalytic Interpretation** — deep Jungian interpretations from Google `gemini-2.5-flash` via structured JSON schemas.
- **Real-time Processing Stamps** — Server-Sent Events stream pipeline stage transitions (`transcribing → analyzing → archived`), so the "Developing Film" screen animates live instead of polling.
- **Pattern Analytics** — Recharts dashboards plus a GitHub-style mood calendar heatmap covering the last 26 weeks.
- **Shared API Contracts** — Zod schemas in `shared/contracts.js` are the single source of truth, validated on the backend and parsed on the frontend so contract drift is caught at the boundary.
- **Route-level ErrorBoundary** — a render-time throw shows a styled fallback rather than blanking the app.
- **Structured Logging** — pino + request-IDs (`x-request-id`) trace each dream through backend → AI service → Gemini.

---

## Directory Structure

```
dream/
├── ai-service/             # FastAPI Python Microservice
│   ├── models/             # Pydantic Schemas
│   ├── routes/             # Analyze & Transcribe endpoint controllers
│   ├── services/           # ML Models loading & pipeline service wrappers
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Container image (with ffmpeg)
│   ├── main.py             # Server lifespan preloading setup
│   └── .env                # Python port, host, HF & Gemini API keys
├── backend/                # Node.js Express Server
│   ├── config/             # Mongoose DB connector
│   ├── controllers/        # Auth, Dreams, and Analytics endpoint controllers
│   ├── middleware/         # Upload verification & JWT auth verification
│   ├── models/             # Mongoose schemas (User, Dream, Pattern)
│   ├── routes/             # Express routes definition
│   ├── services/           # aiService client, dreamEvents pubsub, pino logger
│   ├── Dockerfile          # Container image
│   ├── package.json        # Node server packages
│   ├── server.js           # Server bootstrap configuration
│   └── .env                # Express ports, MongoDB URI, JWT settings
├── frontend/               # React SPA Client
│   ├── src/
│   │   ├── api/            # Axios API calls + Zod response parsing
│   │   ├── components/     # Navbar, ProtectedRoute, ErrorBoundary, MoodHeatmap, ...
│   │   ├── context/        # AuthContext, ToastContext
│   │   ├── pages/          # Dashboard, RecordPage, DetailPage, TimelinePage, AnalyticsPage
│   │   ├── App.jsx         # React routing configurations
│   │   └── index.css       # Custom scrollbars & paper/darkroom styling
│   ├── Dockerfile          # Container image
│   ├── package.json        # Frontend NPM packages
│   └── vite.config.js      # @shared alias + fs.allow for shared contracts
├── shared/                 # Single source of truth for cross-service contracts
│   └── contracts.js        # Zod schemas: CreateDreamRequest, DreamStatusResponse, ...
├── scripts/                # Lifecycle scripts
│   ├── setup.sh            # One-time install (Node, Python venv, env files)
│   ├── start.sh            # Launches all three services with prefixed logs
│   ├── stop.sh             # Kills anything left on ports 5001 / 5173 / 8001
│   └── cleanup_storage.js  # Deletes orphan audio files not referenced by any Dream
├── docker-compose.yml      # One-command stack (mongo + ai + backend + frontend)
├── .env.example            # Compose env template
└── storage/                # Media storage directory (mounted as a volume in compose)
    ├── audio/              # Transferred webm files
    └── temp/               # Temporary uploads
```

---

## Setup & Configuration

### Option A — `docker compose up` (one command)

The fastest path is the new compose stack:

```bash
cp .env.example .env          # then fill in GEMINI_API_KEY + JWT_SECRET
docker compose up --build
```

This brings up Mongo, the AI service (with ffmpeg baked in), the backend, and the Vite dev server. Open <http://localhost:5173>. HF and Whisper model weights are cached in named volumes between runs.

### Option B — local processes

#### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.11 or higher
- **FFmpeg**: required for audio format conversion. (Install via Homebrew on macOS: `brew install ffmpeg`.)
- **MongoDB**: a running local MongoDB instance (`mongodb://127.0.0.1:27017/dream-signal`) or a MongoDB Atlas connection string.

#### 1. AI Microservice
```bash
cd ai-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```
Update `.env`:
```env
PORT=8000
HOST=127.0.0.1
GEMINI_API_KEY=your_gemini_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here  # optional, silences HF download warning
WHISPER_MODEL_SIZE=base                            # tiny | base | small | medium
```
Run:
```bash
python main.py
```

#### 2. Backend Server
```bash
cd ../backend
npm install
```
Configure `.env`:
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/dream-signal
JWT_SECRET=use_a_strong_random_secret_at_least_32_characters_long
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:8000
# Optional:
# REDIS_URL=redis://localhost:6379            # enables BullMQ; inline fallback if blank
# SENTRY_DSN=https://...                       # forwards errors to Sentry
```
Run:
```bash
npm run dev
# or run the test suite:
npm test
```

#### 3. Frontend Client
```bash
cd ../frontend
npm install
npm run dev
```
Open <http://localhost:5173>.

### Option C — unified scripts

```bash
./scripts/setup.sh     # one-time install + .env scaffolding
./scripts/start.sh     # boots all three services with prefixed log streams
./scripts/stop.sh      # kills anything on 5001 / 5173 / 8001
```

---

## Port Allocations

- **Frontend SPA**: <http://localhost:5173>
- **Express Backend API**: <http://localhost:5001> *(5000 is held by macOS AirPlay Receiver)*
- **FastAPI AI Microservice**: <http://localhost:8000> (local) / <http://localhost:8001> (compose)
- **MongoDB** (compose only): `mongodb://localhost:27017`
- **Redis** (compose only, optional): `redis://localhost:6379`

---

## Tests

```bash
cd backend && npm test
```

Vitest + Supertest against an in-process `mongodb-memory-server`. The current suite covers the four critical paths:

- `POST /api/dreams` — text submission, validation, auth, audio-without-file
- `GET /api/dreams/export` — archive header, payload shape, per-user scoping
- `GET /api/dreams/events/:id` — SSE headers, terminal-state initial frame, `?token=` query auth
- `GET /api/analytics/patterns` — lazy compute, response shape, cross-user isolation

The suite caught a real production bug on first run — `processDream` was never added to `module.exports`, so every dream submission in inline (no-Redis) mode silently crashed. Now part of the safety net.

---

## Error Reporting (optional)

Both services have **Sentry** plumbing wired in. They no-op until you paste a DSN:

```env
# backend/.env
SENTRY_DSN=https://<key>@<project>.ingest.sentry.io/<id>

# frontend/.env
VITE_SENTRY_DSN=https://<key>@<project>.ingest.sentry.io/<id>
```

The frontend `ErrorBoundary` forwards render-time crashes; the backend's Express error middleware forwards unhandled rejections + exceptions, with request bodies stripped so dream transcripts never leave the database.

---

## Maintenance

### One-off
```bash
# Dry-run: list audio / image files older than 7 days not referenced by any Dream
node scripts/cleanup_storage.js

# Actually delete the orphans
node scripts/cleanup_storage.js --apply --max-age=14
```

### Recurring (docker-compose)
The `cleanup` service in `docker-compose.yml` runs the script every `CLEANUP_INTERVAL_HOURS` (default 24h). Set `CLEANUP_DRY_RUN=true` in the compose env to log without deleting.

Logs are structured JSON (pino) in production and pretty-printed in dev. Every HTTP request is given an `x-request-id` header that is forwarded to the AI service, so you can grep a single dream end-to-end across both services.

---

## Production Deployment (VPS)

DreamSignal ships a production Docker stack with automatic HTTPS (Caddy) and a static nginx frontend that proxies `/api` to the backend on the same domain.

### What you need

| Resource | Recommendation |
|---|---|
| **VPS** | 4 GB RAM minimum (AI loads Whisper + sentence-transformer). DigitalOcean, Hetzner, AWS Lightsail, etc. |
| **Domain** | A record → your server IP |
| **MongoDB Atlas** | Free tier works; whitelist your server's IP under Network Access |
| **API keys** | `GEMINI_API_KEY` (required), `JWT_SECRET` (32+ random chars) |

### Steps

```bash
# 1. On your VPS — install Docker
curl -fsSL https://get.docker.com | sh

# 2. Clone the repo
git clone https://github.com/octotat-bot/DreamSignal.git
cd DreamSignal

# 3. Configure production env
cp deploy/.env.production.example .env.production
nano .env.production   # set DOMAIN, MONGODB_URI, GEMINI_API_KEY, JWT_SECRET

# 4. Deploy (builds images, starts stack, obtains TLS cert)
bash scripts/deploy-prod.sh
```

Open `https://YOUR_DOMAIN`. Health check: `https://YOUR_DOMAIN/api/health`.

### Architecture (production)

```
Browser → Caddy (:443 TLS) → frontend nginx (:80)
                                  ├─ /        → React static files
                                  ├─ /api/*   → backend:5001
                                  └─ /storage → backend:5001
backend → ai-service:8001 (internal, not public)
backend → MongoDB Atlas (external)
backend → redis (queue, internal)
```

### Useful commands

```bash
# Tail logs
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f

# Restart after env change
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d

# Stop everything
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

### Alternative: split hosting

If you don't want to run the AI service yourself (it's RAM-heavy), you can deploy:

- **Frontend** → Vercel/Netlify (`VITE_API_BASE_URL=https://api.yourdomain.com/api`)
- **Backend** → Railway/Render/Fly
- **AI service** → same host as backend (needs 2–4 GB RAM plan)
- **Database** → MongoDB Atlas

Set `FRONTEND_URL` on the backend to your frontend origin for CORS.

---

## Deploy without a VPS (Render + Vercel)

If you don't have a server, split the app across free/cheap managed platforms. You already use **MongoDB Atlas** — keep that.

| Part | Platform | Cost |
|---|---|---|
| Frontend | **Vercel** | Free |
| Backend API | **Render** | Free (cold starts after 15 min idle) |
| AI service | **Render** | **~$7/mo Starter** (Whisper needs RAM; free tier is too small) |
| Database | **MongoDB Atlas** | Free M0 tier |

> **Note:** Render's disk is ephemeral — uploaded voice recordings may not survive a redeploy. Dream transcripts and analysis in MongoDB are safe.

### Step 1 — MongoDB Atlas

1. [cloud.mongodb.com](https://cloud.mongodb.com) → create a free cluster.
2. **Database Access** → add a user + password.
3. **Network Access** → allow `0.0.0.0/0` (or Render IP ranges).
4. Copy the connection string → you'll paste it as `MONGODB_URI`.

### Step 2 — Backend + AI on Render

1. Push the repo to GitHub (already done if you pulled latest).
2. Go to [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints) → **New Blueprint Instance**.
3. Connect your `DreamSignal` repo — Render reads `render.yaml` automatically.
4. When prompted, set:
   - `MONGODB_URI` — your Atlas connection string
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey)
5. Click **Apply**. Wait ~10–15 min (AI service downloads ML models on first boot).
6. Copy your API URL, e.g. `https://dreamsignal-api.onrender.com`.
7. In Render → **dreamsignal-api** → Environment → set:
   - `FRONTEND_URL` = `https://YOUR-APP.vercel.app` (fill after Step 3)

Health check: `https://dreamsignal-api.onrender.com/api/health`  
Should show `"ai": { "status": "ok", "whisper_loaded": true }`.

### Step 3 — Frontend on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → import your GitHub repo.
2. Set **Root Directory** → `frontend`.
3. Add environment variable:
   ```
   VITE_API_BASE_URL = https://dreamsignal-api.onrender.com/api
   ```
   (use your actual Render API URL from Step 2.)
4. Deploy. Copy your Vercel URL, e.g. `https://dreamsignal.vercel.app`.
5. Go back to Render → **dreamsignal-api** → set `FRONTEND_URL` to that Vercel URL → **Manual Deploy**.

### Step 4 — Test

1. Open your Vercel URL → sign up / log in.
2. File a **written** dream first (fastest test).
3. Try **voice** recording — first AI request after idle may take 30–60s (cold start).

### Troubleshooting

| Problem | Fix |
|---|---|
| Voice fails / health shows AI offline | Upgrade AI service to **Starter** plan; check Render logs for OOM |
| CORS error in browser | Set `FRONTEND_URL` on the API to match your exact Vercel URL (no trailing slash) |
| `502` on API | AI service still booting — wait 5 min, check `/api/health` |
| Login works locally but not deployed | Atlas Network Access must allow Render IPs (`0.0.0.0/0` for testing) |

See `deploy/no-vps.env.example` for a checklist of every env var.
