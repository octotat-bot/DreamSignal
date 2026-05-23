from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class EmbeddedDreamInput(BaseModel):
    dream_id: str
    embedding: List[float]
    title: str

class AnalyzeRequest(BaseModel):
    transcript: str
    dream_id: str
    user_id: str
    existing_embeddings: List[EmbeddedDreamInput] = Field(default_factory=list)

class EmotionItem(BaseModel):
    label: str
    score: float

class SymbolItem(BaseModel):
    label: str
    score: float

class RelatedDream(BaseModel):
    dreamId: str
    similarity: float
    title: str

class AnalysisDetail(BaseModel):
    title: str
    summary: str
    psychologicalInterpretation: str
    cinematicDescription: str
    dominantTheme: str
    environment: str
    mood: str

class AnalyzeResponse(BaseModel):
    analysis: AnalysisDetail
    emotions: List[EmotionItem]
    dominantEmotion: str
    emotionalIntensity: float
    symbols: List[SymbolItem]
    embedding: List[float]
    relatedDreams: List[RelatedDream]
    imagePath: Optional[str] = None
