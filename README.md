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
                                        | + imagen-4.* *  |
                                        +-----------------+
                                        * paid tier only
```

---

## Features

- **Voice Signal Recording** — live audio capture in the browser with an interactive `CanvasWaveform` visualizer.
- **Whisper Transcription** — local high-speed transcription on the FastAPI microservice (`faster-whisper`, CPU int8 quantized).
- **Emotion Recognition** — local zero-shot classifier (cosine similarity between the transcript embedding and pre-embedded emotion prompts) over the same 7-emotion taxonomy as `j-hartmann/emotion-english-distilroberta-base`. Runs on the already-loaded sentence-transformer; no external API.
- **Symbol Extraction** — local zero-shot classifier scoring the transcript against ~50 archetypal Jungian symbols (configurable via `SYMBOL_LABELS`). Same approach as emotions; tunable threshold + top-k.
- **Subconscious Connection** — 384-dim dense vectors via `all-MiniLM-L6-v2` with an LRU cache and cosine similarity to surface related dreams.
- **Psychoanalytic Interpretation** — deep Jungian interpretations from Google `gemini-2.5-flash` via structured JSON schemas.
- **Dream-Scene Imagery (opt-in, paid Gemini tier only)** — when `IMAGEN_ENABLED=true` and the project has billing enabled, `imagen-4.0-fast-generate-001` (with automatic fallback to `gemini-2.5-flash-image`) renders a 16:9 cinematic still from the dream's cinematic description, surfaced as an "evidence photo" on the detail page. Free-tier keys soft-fail with a clear billing message.
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
│   └── cleanup_storage.js  # Deletes orphan audio/image files not referenced by any Dream
├── docker-compose.yml      # One-command stack (mongo + ai + backend + frontend)
├── .env.example            # Compose env template
└── storage/                # Media storage directory (mounted as a volume in compose)
    ├── audio/              # Transferred webm files
    ├── images/             # AI-generated dream scenes (Imagen)
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
IMAGEN_ENABLED=false                               # paid Gemini tier only; see note below
IMAGEN_MODEL=imagen-4.0-fast-generate-001
WHISPER_MODEL_SIZE=base                            # tiny | base | small | medium
```
> Imagen note: `imagen-3.*` is retired and `imagen-4.*` requires billing enabled on the Gemini project. The service handles the 429/400 errors gracefully and leaves `imagePath` null on free tier.
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
