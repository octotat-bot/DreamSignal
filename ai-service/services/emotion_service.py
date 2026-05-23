import os
from typing import List, Dict, Any, Tuple, Optional

import numpy as np


# Same 7-emotion taxonomy as j-hartmann/emotion-english-distilroberta-base
# so downstream consumers (Pattern aggregations, mood heatmap, dashboard)
# don't have to change. Each label is paired with a descriptive prompt so
# zero-shot embedding similarity has a richer anchor than the bare word.
DEFAULT_EMOTION_PROMPTS: Dict[str, str] = {
    "joy": "a feeling of joy, happiness, delight, or elation",
    "sadness": "a feeling of sadness, grief, sorrow, or loss",
    "fear": "a feeling of fear, dread, panic, or anxiety",
    "anger": "a feeling of anger, rage, frustration, or hostility",
    "surprise": "a feeling of surprise, astonishment, or shock",
    "disgust": "a feeling of disgust, revulsion, or aversion",
    "neutral": "a calm, neutral, ordinary emotional state",
}


def _to_unit(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    return matrix / norms


def _softmax(x: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    z = (x - np.max(x)) / max(temperature, 1e-6)
    e = np.exp(z)
    return e / np.sum(e)


class EmotionService:
    """Zero-shot emotion classification.

    Was hitting `api-inference.huggingface.co/models/j-hartmann/emotion-english-
    distilroberta-base` over HTTP, but HF retired that endpoint and migrated to
    `router.huggingface.co/hf-inference/...` which needs a token with the
    "Inference Providers" permission. Rather than chase that, we run zero-shot
    locally using the sentence-transformer already loaded by EmbeddingService.

    Cosine similarity between the transcript embedding and pre-embedded
    emotion prompts is converted to a probability distribution via softmax.
    Results: 7 labels with normalized scores summing to 1, a dominant label,
    and an intensity (0..1) read off the top probability. Same shape as
    before — no caller changes needed.
    """

    def __init__(
        self,
        embedder=None,
        emotion_prompts: Optional[Dict[str, str]] = None,
        temperature: float = 0.18,
    ):
        self.emotion_prompts = emotion_prompts or DEFAULT_EMOTION_PROMPTS
        self.labels: List[str] = list(self.emotion_prompts.keys())
        self.temperature = float(os.getenv("EMOTION_SOFTMAX_TEMP", temperature))
        self.embedder = embedder
        self._label_matrix: Optional[np.ndarray] = None
        if embedder is not None:
            try:
                vectors = embedder.encode(
                    [self.emotion_prompts[k] for k in self.labels],
                    convert_to_numpy=True,
                    show_progress_bar=False,
                )
                self._label_matrix = _to_unit(np.asarray(vectors, dtype=np.float32))
            except Exception as err:
                print(f"EmotionService: failed to embed emotion prompts ({err}); using fallback.")
                self._label_matrix = None

    def get_fallback_emotions(self) -> Tuple[List[Dict[str, Any]], str, float]:
        """Static distribution used when no embedder is available. Mirrors the
        original placeholder so existing aggregates don't silently shift."""
        fallback = [
            {"label": "neutral", "score": 0.4},
            {"label": "joy", "score": 0.1},
            {"label": "sadness", "score": 0.1},
            {"label": "fear", "score": 0.1},
            {"label": "anger", "score": 0.1},
            {"label": "surprise", "score": 0.1},
            {"label": "disgust", "score": 0.1},
        ]
        total = sum(e["score"] for e in fallback)
        for e in fallback:
            e["score"] = round(e["score"] / total, 4)
        return fallback, "neutral", 0.4

    def analyze_emotion(self, text: str) -> Tuple[List[Dict[str, Any]], str, float]:
        if self.embedder is None or self._label_matrix is None or not text or not text.strip():
            return self.get_fallback_emotions()

        try:
            query = self.embedder.encode(text, convert_to_numpy=True, show_progress_bar=False)
            query = np.asarray(query, dtype=np.float32).reshape(1, -1)
            query = _to_unit(query)[0]

            sims = self._label_matrix @ query
            probs = _softmax(sims, self.temperature)

            emotions = [
                {"label": self.labels[i], "score": round(float(probs[i]), 4)}
                for i in range(len(self.labels))
            ]
            emotions.sort(key=lambda x: x["score"], reverse=True)
            dominant = emotions[0]["label"]
            intensity = float(emotions[0]["score"])
            return emotions, dominant, intensity
        except Exception as err:
            print(f"EmotionService.analyze_emotion failed: {err}")
            return self.get_fallback_emotions()
