import os
import requests
from typing import List, Dict, Any, Tuple

class EmotionService:
    def __init__(self, api_key: str = None, model_name: str = "j-hartmann/emotion-english-distilroberta-base"):
        self.api_key = api_key or os.getenv("HUGGINGFACE_API_KEY")
        self.model_name = model_name
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_name}"

    def get_fallback_emotions(self) -> Tuple[List[Dict[str, Any]], str, float]:
        fallback = [
            {"label": "neutral", "score": 0.4},
            {"label": "joy", "score": 0.1},
            {"label": "sadness", "score": 0.1},
            {"label": "fear", "score": 0.1},
            {"label": "anger", "score": 0.1},
            {"label": "surprise", "score": 0.1},
            {"label": "disgust", "score": 0.1}
        ]
        # Ensure it sums to 1.0
        total = sum(e["score"] for e in fallback)
        for e in fallback:
            e["score"] = round(e["score"] / total, 4)
            
        return fallback, "neutral", 0.4

    def analyze_emotion(self, text: str) -> Tuple[List[Dict[str, Any]], str, float]:
        if not self.api_key:
            return self.get_fallback_emotions()

        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {"inputs": text, "options": {"wait_for_model": True}}

        try:
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=10)
            if response.status_code != 200:
                # Log or print status code and response
                print(f"HuggingFace Emotion API error status: {response.status_code}, response: {response.text}")
                return self.get_fallback_emotions()

            data = response.json()
            # The API returns list of lists (e.g. [[{"label": "...", "score": ...}, ...]])
            if isinstance(data, list) and len(data) > 0:
                raw_emotions = data[0] if isinstance(data[0], list) else data
                
                # Check formatting
                if not all(isinstance(x, dict) and "label" in x and "score" in x for x in raw_emotions):
                    return self.get_fallback_emotions()
                
                # Normalize scores
                total_score = sum(e["score"] for e in raw_emotions)
                if total_score <= 0:
                    return self.get_fallback_emotions()

                emotions = []
                for e in raw_emotions:
                    emotions.append({
                        "label": e["label"].lower(),
                        "score": round(e["score"] / total_score, 4)
                    })

                # Sort by score desc
                emotions.sort(key=lambda x: x["score"], reverse=True)
                dominant_emotion = emotions[0]["label"]
                emotional_intensity = emotions[0]["score"]
                
                return emotions, dominant_emotion, emotional_intensity
            else:
                return self.get_fallback_emotions()

        except Exception as err:
            print(f"HuggingFace Emotion API request exception: {err}")
            return self.get_fallback_emotions()
