import os
import requests
from typing import List, Dict, Any

class SymbolService:
    def __init__(self, api_key: str = None, model_name: str = "facebook/bart-large-mnli"):
        self.api_key = api_key or os.getenv("HUGGINGFACE_API_KEY")
        self.model_name = model_name
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_name}"
        self.candidate_labels = [
            "water", "fire", "flight", "falling", "death", "pursuit",
            "house", "animal", "stranger", "darkness", "light",
            "forest", "ocean", "mountain", "door", "mirror",
            "clock", "child", "vehicle", "storm"
        ]

    def extract_symbols(self, text: str) -> List[Dict[str, Any]]:
        if not self.api_key or not text.strip():
            return []

        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "inputs": text,
            "parameters": {"candidate_labels": self.candidate_labels},
            "options": {"wait_for_model": True}
        }

        try:
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=15)
            if response.status_code != 200:
                print(f"HuggingFace Symbol API error status: {response.status_code}, response: {response.text}")
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
                            "score": round(score, 4)
                        })
                
                # Sort and return top 5
                extracted.sort(key=lambda x: x["score"], reverse=True)
                return extracted[:5]
            else:
                return []

        except Exception as err:
            print(f"HuggingFace Symbol API request exception: {err}")
            return []
