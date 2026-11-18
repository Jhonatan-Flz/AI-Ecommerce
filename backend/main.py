from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from ai_engine import SemanticSearchEngine
except ImportError:
    from backend.ai_engine import SemanticSearchEngine

app = FastAPI(
    title="AI-Ecommerce Semantic Search API",
    description="Hybrid natural-language product discovery and recommendation engine.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SemanticSearchEngine(model_name="all-MiniLM-L6-v2")

kpi_metrics = {
    "total_searches": 0,
    "ai_searches": 0,
    "product_views": 0,
}


class SearchRequest(BaseModel):
    prompt: str = ""
    keyword: str = ""
    category: str = "all"
    max_price: float = 250.0
    channels: List[str] = Field(default_factory=lambda: ["official", "marketplace", "affiliate"])
    viewed_ids: List[int] = Field(default_factory=list)


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "model": engine.model_name,
        "indexed_products": len(engine.products),
    }


@app.post("/api/search")
def search_products(payload: SearchRequest):
    kpi_metrics["total_searches"] += 1
    if payload.prompt.strip():
        kpi_metrics["ai_searches"] += 1

    results = engine.search(
        prompt=payload.prompt,
        keyword=payload.keyword,
        category=payload.category,
        max_price=payload.max_price,
        channels=payload.channels,
        viewed_ids=payload.viewed_ids,
    )

    visible_ids = [item["id"] for item in results]
    recommendations = engine.get_recommendations(
        viewed_ids=payload.viewed_ids,
        exclude_ids=visible_ids,
        limit=3,
    )

    return {
        "results": results,
        "recommendations": recommendations,
    }


@app.get("/api/products/{product_id}")
def get_product_detail(product_id: int):
    if product_id not in engine.id_to_index:
        raise HTTPException(status_code=404, detail="Product not found")

    kpi_metrics["product_views"] += 1
    product = engine.products[engine.id_to_index[product_id]]
    complements = engine.get_complements(product_id=product_id, limit=3)

    return {
        "product": product,
        "complements": complements,
    }


@app.get("/api/metrics")
def get_metrics():
    return kpi_metrics