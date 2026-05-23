import os
from typing import List, Dict, Any, Optional

import numpy as np


# Default candidate symbol set. ~50 archetypes spanning natural elements,
# spatial archetypes, social figures, transformations, and metaphysical
# motifs — enough breadth to score most dreams without diluting the
# zero-shot signal. Override at instantiation or via the SYMBOL_LABELS
# env var (comma-separated) without touching code.
DEFAULT_CANDIDATE_LABELS = [
    # Elements & nature
    "water", "fire", "earth", "air", "light", "darkness", "storm",
    "rain", "snow", "fog",
    # Spaces & structures
    "house", "door", "stairway", "mirror", "labyrinth", "bridge",
    "tunnel", "room", "window", "ruins",
    # Landscape
    "forest", "ocean", "mountain", "desert", "river", "garden",
    "cave", "sky",
    # Living beings & figures
    "animal", "shadow", "stranger", "child", "elder", "lover",
    "crowd", "twin", "guide",
    # Transformations & actions
    "flight", "falling", "pursuit", "death", "rebirth", "transformation",
    "loss", "discovery", "journey",
    # Objects & instruments
    "vehicle", "clock", "key", "book", "weapon",
    # Metaphysical
    "void", "threshold",
]


def _parse_env_labels() -> List[str]:
    raw = os.getenv("SYMBOL_LABELS", "").strip()
    if not raw:
        return []
    return [s.strip() for s in raw.split(",") if s.strip()]


def _to_unit(matrix: np.ndarray) -> np.ndarray:
    """L2-normalize each row so cosine similarity becomes a single dot product."""
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    return matrix / norms


class SymbolService:
    """Zero-shot symbol classification.

    Originally hit `api-inference.huggingface.co/models/facebook/bart-large-mnli`
    via the HuggingFace Inference API. HF retired that endpoint in 2024 and
    moved everything to `router.huggingface.co/hf-inference/...`, and the new
    router requires a fine-grained token with the "Make calls to Inference
    Providers" scope. That's two new failure modes (DNS + auth) for a feature
    that doesn't need a separate model at all — the sentence-transformer the
    embedding service already loads handles cosine similarity just fine.

    So: we now do zero-shot locally. On init we embed each candidate label
    once, then `extract_symbols` embeds the transcript and ranks labels by
    cosine similarity. No network, no token, no rate limits, ~milliseconds
    per call after warmup. If the embedder isn't available we soft-fail to
    an empty list so the rest of the analyze pipeline keeps working.
    """

    def __init__(
        self,
        embedder=None,
        candidate_labels: Optional[List[str]] = None,
        threshold: float = 0.18,
        top_k: int = 5,
    ):
        # Precedence: explicit arg > SYMBOL_LABELS env > defaults.
        self.candidate_labels: List[str] = (
            candidate_labels or _parse_env_labels() or DEFAULT_CANDIDATE_LABELS
        )
        self.threshold = float(os.getenv("SYMBOL_SCORE_THRESHOLD", threshold))
        self.top_k = int(os.getenv("SYMBOL_TOP_K", top_k))

        self.embedder = embedder
        self._label_matrix: Optional[np.ndarray] = None
        if embedder is not None:
            try:
                self._label_matrix = self._embed_labels(embedder, self.candidate_labels)
            except Exception as err:
                print(f"SymbolService: failed to embed candidate labels ({err}); disabling.")
                self._label_matrix = None
        else:
            print(
                "SymbolService: no embedder provided — symbol classification will "
                "return [] until the sentence-transformer is wired in."
            )

    @staticmethod
    def _embed_labels(embedder, labels: List[str]) -> np.ndarray:
        # Tiny semantic priming: "<label> as a dream symbol" pulls embeddings
        # toward the symbolic interpretation rather than the literal noun
        # cluster — measurably tighter recall on dream transcripts.
        prompts = [f"{label} as a dream symbol" for label in labels]
        vectors = embedder.encode(prompts, convert_to_numpy=True, show_progress_bar=False)
        return _to_unit(np.asarray(vectors, dtype=np.float32))

    def extract_symbols(self, text: str) -> List[Dict[str, Any]]:
        if self._label_matrix is None or self.embedder is None:
            return []
        if not text or not text.strip():
            return []

        try:
            query = self.embedder.encode(text, convert_to_numpy=True, show_progress_bar=False)
            query = np.asarray(query, dtype=np.float32).reshape(1, -1)
            query = _to_unit(query)[0]

            # Cosine sim against the unit-normed label matrix.
            scores = self._label_matrix @ query
            order = np.argsort(-scores)

            extracted: List[Dict[str, Any]] = []
            for idx in order:
                score = float(scores[idx])
                if score < self.threshold:
                    break
                extracted.append({
                    "label": self.candidate_labels[int(idx)],
                    "score": round(score, 4),
                })
                if len(extracted) >= self.top_k:
                    break

            return extracted
        except Exception as err:
            print(f"SymbolService.extract_symbols failed: {err}")
            return []
