from fastapi import APIRouter, HTTPException, Request
from models.schemas import AnalyzeRequest, AnalyzeResponse, AnalysisDetail, EmotionItem, SymbolItem, RelatedDream
import traceback

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_dream(request: Request, body: AnalyzeRequest):
    # Services are loaded on the app state
    emotion_service = getattr(request.app.state, "emotion_service", None)
    symbol_service = getattr(request.app.state, "symbol_service", None)
    embedding_service = getattr(request.app.state, "embedding_service", None)
    gemini_service = getattr(request.app.state, "gemini_service", None)

    transcript = body.transcript

    # Step 2: Emotion Classification
    emotions = []
    dominant_emotion = "neutral"
    emotional_intensity = 0.5
    try:
        if emotion_service:
            emotions, dominant_emotion, emotional_intensity = emotion_service.analyze_emotion(transcript)
        else:
            raise ValueError("Emotion service not initialized.")
    except Exception as err:
        print(f"Error in emotion classification pipeline step: {err}")
        # Fallback
        emotions = [{"label": "neutral", "score": 1.0}]
        dominant_emotion = "neutral"
        emotional_intensity = 1.0

    # Step 3: Symbol Extraction
    symbols = []
    try:
        if symbol_service:
            symbols = symbol_service.extract_symbols(transcript)
        else:
            raise ValueError("Symbol service not initialized.")
    except Exception as err:
        print(f"Error in symbol extraction pipeline step: {err}")
        symbols = []

    # Step 4: Embedding Generation
    embedding = [0.0] * 384
    try:
        if embedding_service:
            embedding = embedding_service.generate_embedding(transcript)
        else:
            raise ValueError("Embedding service not initialized.")
    except Exception as err:
        print(f"Error in embedding generation pipeline step: {err}")
        embedding = [0.0] * 384

    # Step 5: Related Dreams (Similarity Search)
    related_dreams = []
    try:
        if embedding_service and body.existing_embeddings:
            # Map request existing_embeddings to Dict structure expected by service
            existing_list = []
            for item in body.existing_embeddings:
                existing_list.append({
                    "dream_id": item.dream_id,
                    "embedding": item.embedding,
                    "title": item.title
                })
            related_dreams = embedding_service.get_related_dreams(embedding, existing_list)
    except Exception as err:
        print(f"Error in similarity search pipeline step: {err}")
        related_dreams = []

    # Step 6: Gemini Interpretation
    analysis = {}
    try:
        if gemini_service:
            analysis = gemini_service.interpret_dream(transcript, emotions, symbols)
        else:
            raise ValueError("Gemini service not initialized.")
    except Exception as err:
        print(f"Error in Gemini interpretation pipeline step: {err}")
        if gemini_service:
            analysis = gemini_service.get_fallback_analysis(transcript)
        else:
            analysis = {
                "title": "Untitled Dream",
                "summary": transcript[:200] if len(transcript) <= 200 else transcript[:200] + "...",
                "psychologicalInterpretation": "Awaiting psychological analysis.",
                "cinematicDescription": "A scene unfolding in the background of consciousness.",
                "dominantTheme": "Subconscious Process",
                "environment": "Unknown",
                "mood": "Neutral"
            }

    # Normalize objects for response model validation
    emotion_items = [EmotionItem(label=e["label"], score=e["score"]) for e in emotions]
    symbol_items = [SymbolItem(label=s["label"], score=s["score"]) for s in symbols]
    related_dream_items = [
        RelatedDream(dreamId=r["dreamId"], similarity=r["similarity"], title=r["title"])
        for r in related_dreams
    ]

    analysis_detail = AnalysisDetail(
        title=analysis.get("title", "Untitled Dream"),
        summary=analysis.get("summary", "No summary available."),
        psychologicalInterpretation=analysis.get("psychologicalInterpretation", "No psychological interpretation."),
        cinematicDescription=analysis.get("cinematicDescription", "No cinematic description."),
        dominantTheme=analysis.get("dominantTheme", "Unknown Theme"),
        environment=analysis.get("environment", "Unknown setting"),
        mood=analysis.get("mood", "Neutral")
    )

    return AnalyzeResponse(
        analysis=analysis_detail,
        emotions=emotion_items,
        dominantEmotion=dominant_emotion,
        emotionalIntensity=emotional_intensity,
        symbols=symbol_items,
        embedding=embedding,
        relatedDreams=related_dream_items,
    )
