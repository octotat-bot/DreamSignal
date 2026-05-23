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
               | / Local Server |          | (Port 8001 ML API) |
               +----------------+          +------+-------------+
                                                  |
                         +------------------------+------------------------+
                         |                        |                        |
                         v local                  v local                  v HF Inference /
               +-----------------+      +-----------------+      +-----------------+
               | Faster-Whisper  |      | Sentence-       |      | DistilRoBERTa & |
               | (Voice Transcr) |      | Transformers    |      | BART Zero-Shot  |
               +-----------------+      +-----------------+      +-----------------+
                                                  |
                                                  v Gemini API
                                        +-----------------+
                                        | Gemini 1.5 Flash|
                                        | + Imagen 3      |
                                        +-----------------+
```

---

## Features

- **Voice Signal Recording** — live audio capture in the browser with an interactive `CanvasWaveform` visualizer.
- **Whisper Transcription** — local high-speed transcription on the FastAPI microservice (`faster-whisper`, CPU int8 quantized).
- **Emotion Recognition** — HuggingFace DistilRoBERTa English emotion classifier.
- **Symbol Extraction** — zero-shot symbol classification mapping the transcript to ~40 candidate Jungian symbols (configurable).
- **Subconscious Connection** — 384-dim dense vectors via `all-MiniLM-L6-v2` and cosine similarity to link related dreams.
- **Psychoanalytic Interpretation** — deep Jungian interpretations from Google Gemini 1.5 Flash via structured schemas.
- **Dream-Scene Imagery (opt-in)** — Gemini Imagen renders a 16:9 cinematic still from the dream's cinematic description, surfaced as an "evidence photo" on the detail page.
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
PORT=8001
HOST=127.0.0.1
GEMINI_API_KEY=your_gemini_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here  # optional, raises HF rate limits
IMAGEN_ENABLED=false                               # set true to generate per-dream images
IMAGEN_MODEL=imagen-3.0-generate-002
WHISPER_MODEL=base                                 # tiny | base | small | medium
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
MONGO_URI=mongodb://127.0.0.1:27017/dream-signal
JWT_SECRET=use_a_strong_random_secret_at_least_32_characters_long
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:8001
LOG_LEVEL=debug
```
Run:
```bash
npm run dev
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
- **FastAPI AI Microservice**: <http://localhost:8001>
- **MongoDB** (compose only): `mongodb://localhost:27017`

---

## Maintenance

```bash
# Dry-run: list audio / image files older than 7 days not referenced by any Dream
node scripts/cleanup_storage.js

# Actually delete the orphans
node scripts/cleanup_storage.js --apply --max-age=14
```

Logs are structured JSON (pino) in production and pretty-printed in dev. Every HTTP request is given an `x-request-id` header that is forwarded to the AI service, so you can grep a single dream end-to-end across both services.
