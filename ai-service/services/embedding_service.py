import hashlib
import os
import time
import requests
from collections import OrderedDict

import numpy as np
from typing import List, Dict, Any


class _LRUCache:
    """Tiny capped LRU. We deliberately don't pull in cachetools to keep
    the dependency surface minimal — the access pattern (hash -> 384-float
    list) and capacity (~512) fit fine in an OrderedDict."""

    def __init__(self, capacity: int):
        self.capacity = max(1, int(capacity))
        self._data: "OrderedDict[str, List[float]]" = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key: str):
        if key in self._data:
            self._data.move_to_end(key)
            self.hits += 1
            return self._data[key]
        self.misses += 1
        return None

    def put(self, key: str, value: List[float]):
        if key in self._data:
            self._data.move_to_end(key)
        self._data[key] = value
        while len(self._data) > self.capacity:
            self._data.popitem(last=False)


class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", cache_size: int = None):
        self.use_hf = os.getenv("USE_HF_EMBEDDINGS", "false").lower() == "true"
        if not self.use_hf:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(model_name, device="cpu")
        else:
            self.model = None

        capacity = cache_size if cache_size is not None else int(os.getenv("EMBEDDING_CACHE_SIZE", "512"))
        self._cache = _LRUCache(capacity)

    @staticmethod
    def _cache_key(text: str) -> str:
        # Hash the *normalized* transcript so trivial whitespace / case
        # differences (e.g. trailing newline from form submission) still
        # share a cache entry.
        normalized = " ".join(text.strip().lower().split())
        return hashlib.sha1(normalized.encode("utf-8")).hexdigest()

    def generate_embedding(self, text: str) -> List[float]:
        if not text.strip():
            # Return empty embedding (384 zeros) if empty text
            return [0.0] * 384

        key = self._cache_key(text)
        cached = self._cache.get(key)
        if cached is not None:
            return cached

        if self.use_hf:
            embedding = self._generate_hf(text)
        else:
            embedding = self.model.encode(text).tolist()

        self._cache.put(key, embedding)
        return embedding

    def _generate_hf(self, text: str) -> List[float]:
        api_key = os.getenv("HUGGINGFACE_API_KEY")
        headers = {"Authorization": f"Bearer {api_key}"}
        url = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
        
        for attempt in range(2):
            try:
                response = requests.post(url, headers=headers, json={"inputs": text}, timeout=15)
            except requests.exceptions.Timeout:
                print("Embedding API timed out")
                return [0.0] * 384
            except Exception as e:
                print(f"Embedding API request failed: {e}")
                return [0.0] * 384

            if response.status_code == 503 and attempt == 0:
                print("Embedding model loading on HuggingFace, waiting 20s...")
                time.sleep(20)
                continue
            
            if response.status_code != 200:
                print(f"Embedding API error {response.status_code}: {response.text}")
                return [0.0] * 384
            
            try:
                result = response.json()
                if isinstance(result, list):
                    # Response is a nested list, take response[0]
                    if len(result) > 0 and isinstance(result[0], list) and len(result[0]) == 384:
                        return result[0]
                    elif len(result) == 384:
                        # Fallback if it ever returns a flat list
                        return result
                print(f"Embedding API returned unexpected shape: {result}")
                return [0.0] * 384
            except Exception as e:
                print(f"Embedding API JSON parse error: {e}")
                return [0.0] * 384
                
        print("Embedding API model loading timeout")
        return [0.0] * 384

    def cache_stats(self) -> Dict[str, int]:
        """Exposed so /health or admin routes can surface hit-rate over time."""
        return {
            "hits": self._cache.hits,
            "misses": self._cache.misses,
            "size": len(self._cache._data),
            "capacity": self._cache.capacity,
        }

    def get_related_dreams(self, new_embedding: List[float], existing_embeddings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not existing_embeddings:
            return []

        a = np.array(new_embedding)
        norm_a = np.linalg.norm(a)
        if norm_a == 0:
            return []

        related = []
        for item in existing_embeddings:
            b = np.array(item["embedding"])
            norm_b = np.linalg.norm(b)
            if norm_b == 0:
                continue

            similarity = float(np.dot(a, b) / (norm_a * norm_b))
            if similarity > 0.65:
                related.append({
                    "dreamId": item["dream_id"],
                    "similarity": round(similarity, 4),
                    "title": item["title"]
                })

        # Sort descending by similarity score
        related.sort(key=lambda x: x["similarity"], reverse=True)
        return related[:3]
