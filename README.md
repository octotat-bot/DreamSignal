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
                                       | HTTPS / JSON
                                       v
                    +------------------------------------+
                    |       Node.js Express Server       |
                    |         (Port 5000 Backend)        |
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
                         v local                  v local                  v HF Inference /
               +-----------------+      +-----------------+      +-----------------+
               | Faster-Whisper  |      | Sentence-       |      | DistilRoBERTa & |
               | (Voice Transcr) |      | Transformers    |      | BART Zero-Shot  |
               +-----------------+      +-----------------+      +-----------------+
                                                  |
                                                  v Gemini API
                                        +-----------------+
                                        | Gemini 1.5      |
                                        | Psychoanalysis  |
                                        +-----------------+
```

---

## Features

- **Voice Signal Recording**: Live audio recording from the browser with interactive `CanvasWaveform` visualizer.
- **Whisper Transcription**: Local high-speed transcription running on the FastAPI microservice (`faster-whisper` CPU int8 quantized model).
- **Emotion Recognition**: Analyzes emotion distributions using HuggingFace's DistilRoBERTa english model.
- **Symbol Extraction**: Zero-shot symbol classification mapping text patterns to 20 candidate Jungian symbols.
- **Subconscious Connection (Semantic Similarity)**: Generates 384-dimensional dense vectors via `all-MiniLM-L6-v2` locally and computes programmatic cosine similarity to automatically link related dreams.
- **Psychoanalytical Interpretation**: Deep Jungian interpretations generated using Google Gemini 1.5 Flash structured schemas.
- **Pattern Analytics**: Interactive trends dashboards built on Recharts demonstrating emotional timeline logs, dominant states, recurring symbols, and consecutive dream continuity pairs.

---

## Directory Structure

```
dream/
├── ai-service/             # FastAPI Python Microservice
│   ├── models/             # Pydantic Schemas
│   ├── routes/             # Analyze & Transcribe endpoint controllers
│   ├── services/           # ML Models loading & pipeline service wrappers
│   ├── requirements.txt    # Python dependencies
│   ├── main.py             # Server lifespan preloading setup
│   └── .env                # Python port, host, HF & Gemini API keys
├── backend/                # Node.js Express Server
│   ├── config/             # Mongoose DB connector
│   ├── controllers/        # Auth, Dreams, and Analytics endpoint controllers
│   ├── middleware/         # Upload verification & JWT auth verification
│   ├── models/             # Mongoose schemas (User, Dream, Pattern)
│   ├── routes/             # Express routes definition
│   ├── services/           # Axios backend-to-AI connectors
│   ├── package.json        # Node server packages
│   ├── server.js           # Server bootstrap configuration
│   └── .env                # Express ports, MongoDB URI, JWT settings
├── frontend/               # React SPA Client
│   ├── src/
│   │   ├── api/            # Axios API calls mapping
│   │   ├── components/     # Navbar, ProtectedRoute, CanvasWaveform
│   │   ├── context/        # AuthContext, ToastContext
│   │   ├── pages/          # Dashboard, RecordPage, DetailPage, TimelinePage, AnalyticsPage
│   │   ├── App.jsx         # React routing configurations
│   │   └── index.css       # Custom scrollbars & glassmorphism styling
│   ├── package.json        # Frontend NPM packages
│   └── tailwind.config.js  # Theme extensions & custom palettes
├── scripts/                # Lifecycle scripts
│   ├── setup.sh            # One-time install (Node, Python venv, env files)
│   ├── start.sh            # Launches all three services with prefixed logs
│   └── stop.sh             # Kills anything left on ports 5001 / 5173 / 8000
└── storage/                # Media storage directory
    ├── audio/              # Transferred webm files
    └── temp/               # Temporary uploads
```

---

## Setup & Configuration

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.11 or higher
- **FFmpeg**: Required for audio format conversion. (Install via Homebrew on Mac: `brew install ffmpeg`)
- **MongoDB**: A running local MongoDB instance (`mongodb://127.0.0.1:27017/dream-signal`) or a MongoDB Atlas connection string.

### 1. AI Microservice Configuration
Go into the `ai-service/` folder:
```bash
cd ai-service
```
Create a virtual environment and activate it:
```bash
python3 -m venv venv
source venv/bin/activate
```
Install dependencies:
```bash
pip install -r requirements.txt
```
Update `.env` with your API credentials:
```env
PORT=8000
HOST=127.0.0.1
GEMINI_API_KEY=your_gemini_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```
Run the FastAPI development server:
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Backend Server Configuration
Go into the `backend/` folder:
```bash
cd ../backend
```
Install NPM dependencies:
```bash
npm install
```
Configure your `.env` variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/dream-signal
JWT_SECRET=use_a_strong_random_secret_at_least_32_characters_long
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:8000
```
Run the development server:
```bash
npm run dev
```

### 3. Frontend Client Configuration
Go into the `frontend/` folder:
```bash
cd ../frontend
```
Install NPM packages:
```bash
npm install
```
Start the Vite developer environment:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Port Allocations
- **Frontend SPA**: `http://localhost:5173`
- **Express Backend API**: `http://localhost:5000`
- **FastAPI AI Microservice**: `http://localhost:8000`
