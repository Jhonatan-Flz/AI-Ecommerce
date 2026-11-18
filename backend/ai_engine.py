import json
from pathlib import Path
from typing import List, Optional
import numpy as np
from sentence_transformers import SentenceTransformer


class SemanticSearchEngine:
    """
    Local NLP search and recommendation engine powered by sentence embeddings.
    Supports hybrid filtering, session-based algorithmic memory, and vector cross-selling.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)
        self.products = self._load_products()
        self.id_to_index = {p["id"]: idx for idx, p in enumerate(self.products)}
        self.embeddings = self._encode_catalog()

    def _load_products(self) -> List[dict]:
        catalog_path = Path(__file__).parent / "products.json"
        with open(catalog_path, "r", encoding="utf-8") as file:
            return json.load(file)

    def _encode_catalog(self) -> np.ndarray:
        corpus = [
            f"{p['title']}. Category: {p['category']}. {p['description']} "
            f"Features: {', '.join(p.get('tags', []))}"
            for p in self.products
        ]
        return self.model.encode(corpus, normalize_embeddings=True)

    def _build_session_vector(self, viewed_ids: List[int]) -> Optional[np.ndarray]:
        valid_indices = [self.id_to_index[pid] for pid in viewed_ids if pid in self.id_to_index]
        if not valid_indices:
            return None

        history_vec = np.mean(self.embeddings[valid_indices], axis=0)
        norm = np.linalg.norm(history_vec)
        return history_vec / norm if norm > 0 else None

    @staticmethod
    def _scale_similarity(raw_score: float, threshold: float = 0.23) -> int:
        if raw_score < threshold:
            return 0
        normalized = min(1.0, max(0.0, (raw_score - threshold) / (0.70 - threshold)))
        return round(60 + normalized * 39)

    def search(
        self,
        prompt: str = "",
        keyword: str = "",
        category: str = "all",
        max_price: float = 250.0,
        channels: Optional[List[str]] = None,
        viewed_ids: Optional[List[int]] = None,
    ) -> List[dict]:
        active_channels = set(channels) if channels is not None else {"official", "marketplace", "affiliate"}
        keyword_clean = keyword.strip().lower()
        prompt_clean = prompt.strip()

        # 1. Structured filtering
        filtered_indices = []
        for idx, item in enumerate(self.products):
            if category != "all" and item["category"] != category:
                continue
            if item["price"] > max_price:
                continue
            if item["channel"] not in active_channels:
                continue
            if keyword_clean:
                haystack = f"{item['title']} {item['description']}".lower()
                if keyword_clean not in haystack:
                    continue
            filtered_indices.append(idx)

        if not filtered_indices:
            return []

        # 2. Return standard filtered results if no AI prompt is provided
        if not prompt_clean:
            return [dict(self.products[idx]) for idx in filtered_indices]

        # 3. Encode prompt + blend session preference vector (85% intent, 15% history)
        query_vec = self.model.encode([prompt_clean], normalize_embeddings=True)[0]
        session_vec = self._build_session_vector(viewed_ids or [])

        if session_vec is not None:
            blended = 0.85 * query_vec + 0.15 * session_vec
            norm = np.linalg.norm(blended)
            if norm > 0:
                query_vec = blended / norm

        # 4. Rank filtered candidates by cosine similarity
        candidate_embeddings = self.embeddings[filtered_indices]
        scores = np.dot(candidate_embeddings, query_vec)

        ranked_results = []
        for idx, raw_score in zip(filtered_indices, scores):
            match_score = self._scale_similarity(float(raw_score))
            if match_score > 0:
                item_copy = dict(self.products[idx])
                item_copy["matchScore"] = match_score
                ranked_results.append(item_copy)

        ranked_results.sort(key=lambda x: x["matchScore"], reverse=True)
        if ranked_results:
            top_score = ranked_results[0]["matchScore"]
            ranked_results = [
                item for item in ranked_results
                if (top_score - item["matchScore"]) <= 24
            ]

        return ranked_results[:9]

    def get_recommendations(
        self,
        viewed_ids: Optional[List[int]] = None,
        exclude_ids: Optional[List[int]] = None,
        limit: int = 3,
    ) -> List[dict]:
        valid_viewed = [pid for pid in (viewed_ids or []) if pid in self.id_to_index]
        excluded = set(exclude_ids or [])
        session_vec = self._build_session_vector(valid_viewed)

        if session_vec is not None:
            last_product = self.products[self.id_to_index[valid_viewed[-1]]]
            scores = np.dot(self.embeddings, session_vec)
            ranked_indices = np.argsort(scores)[::-1]

            recs = []
            for idx in ranked_indices:
                item = self.products[idx]
                if item["id"] in valid_viewed:
                    continue
                item_copy = dict(item)
                item_copy["reason"] = f"Inspired by {last_product['title']}"
                recs.append(item_copy)
                if len(recs) >= limit:
                    break
            return recs

        candidates = [p for p in self.products if p["id"] not in excluded]
        pool = candidates if len(candidates) >= limit else self.products
        return [
            {**dict(item), "reason": "Popular in your segment"}
            for item in pool[:limit]
        ]

    def get_complements(self, product_id: int, limit: int = 3) -> List[dict]:
        if product_id not in self.id_to_index:
            return []

        target_idx = self.id_to_index[product_id]
        target_product = self.products[target_idx]
        target_vec = self.embeddings[target_idx]

        scores = np.dot(self.embeddings, target_vec)
        ranked_indices = np.argsort(scores)[::-1]

        cross_category = []
        same_category = []

        for idx in ranked_indices:
            if idx == target_idx:
                continue
            item = dict(self.products[idx])
            if item["category"] != target_product["category"]:
                cross_category.append(item)
            else:
                same_category.append(item)

        return (cross_category + same_category)[:limit]