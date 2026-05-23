import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload models on startup
    print("Bootstrapping AI service models...")
    
    # Import services here to prevent circular imports and keep startup flow organized
    from services.whisper_service import WhisperService
    from services.emotion_service import EmotionService
    from services.symbol_service import SymbolService
    from services.embedding_service import EmbeddingService
    from services.gemini_service import GeminiService

    # Instantiate services and attach to app state
    whisper_model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
    embedding_model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    app.state.whisper_service = WhisperService(model_size=whisper_model_size)
    app.state.emotion_service = EmotionService()
    app.state.symbol_service = SymbolService()
    app.state.embedding_service = EmbeddingService(model_name=embedding_model_name)
    app.state.gemini_service = GeminiService()

    print("All ML models preloaded and active.")
    yield
    print("Shutting down AI service components.")

app = FastAPI(
    title="Dream Signal AI Microservice",
    description="Multimodal ML pipeline for recording, transcription, emotion modelling, symbol parsing, and interpretation",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS (allow Express backend to communicate)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Secured by backend route limits
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
from routes import transcribe, analyze
app.include_router(transcribe.router, tags=["Transcription"])
app.include_router(analyze.router, tags=["Dream Analysis"])

@app.get("/health")
async def health_check():
    whisper_loaded = hasattr(app.state, "whisper_service") and app.state.whisper_service is not None
    embedding_loaded = hasattr(app.state, "embedding_service") and app.state.embedding_service is not None
    return {
        "status": "ok",
        "whisper_loaded": whisper_loaded,
        "sentence_transformer_loaded": embedding_loaded
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
