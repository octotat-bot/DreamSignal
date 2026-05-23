import hashlib
import os
from collections import OrderedDict

import numpy as np
from sentence_transformers import SentenceTransformer
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
        # Load the sentence-transformer model locally
        self.model = SentenceTransformer(model_name, device="cpu")
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

        embedding = self.model.encode(text).tolist()
        self._cache.put(key, embedding)
        return embedding

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
