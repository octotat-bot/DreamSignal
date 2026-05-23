import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any

class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        # Load the sentence-transformer model locally
        self.model = SentenceTransformer(model_name, device="cpu")

    def generate_embedding(self, text: str) -> List[float]:
        if not text.strip():
            # Return empty embedding (384 zeros) if empty text
            return [0.0] * 384
        embedding = self.model.encode(text)
        return embedding.tolist()

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
