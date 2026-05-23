import os
import requests
from typing import List, Dict, Any

# Default candidate symbol set. ~45 archetypes spanning natural elements,
# spatial archetypes, social figures, transformations, and metaphysical
# motifs — enough breadth to score most dreams without diluting the
# zero-shot model's accuracy. Override at instantiation or via the
# SYMBOL_LABELS env var (comma-separated) without touching code.
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


class SymbolService:
    def __init__(self, api_key: str = None, model_name: str = "facebook/bart-large-mnli", candidate_labels=None):
        self.api_key = api_key or os.getenv("HUGGINGFACE_API_KEY")
        self.model_name = model_name
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_name}"
        # Precedence: explicit constructor arg > SYMBOL_LABELS env > defaults.
        self.candidate_labels = candidate_labels or _parse_env_labels() or DEFAULT_CANDIDATE_LABELS
        if not self.api_key:
            print(
                "SymbolService: HUGGINGFACE_API_KEY missing — zero-shot symbol "
                "classification will be skipped. Set the key in ai-service/.env "
                "to enable it."
            )

    def extract_symbols(self, text: str) -> List[Dict[str, Any]]:
        if not self.api_key or not text.strip():
            return []

        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "inputs": text,
            "parameters": {"candidate_labels": self.candidate_labels},
            "options": {"wait_for_model": True},
        }

        try:
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=20)
            if response.status_code != 200:
                print(
                    f"HuggingFace Symbol API error status: {response.status_code}, "
                    f"response: {response.text[:300]}"
                )
                return []

            data = response.json()
            if "labels" in data and "scores" in data:
                labels = data["labels"]
                scores = data["scores"]

                extracted = []
                for label, score in zip(labels, scores):
                    if score > 0.15:
                        extracted.append({
                            "label": label,
                            "score": round(score, 4),
                        })

                # Sort and return top 5
                extracted.sort(key=lambda x: x["score"], reverse=True)
                return extracted[:5]
            else:
                return []

        except Exception as err:
            print(f"HuggingFace Symbol API request exception: {err}")
            return []
