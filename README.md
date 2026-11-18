# AI-Ecommerce — Semantic Product Discovery Assistant

A lightweight, locally hosted hybrid e-commerce search engine powered by Natural Language Processing (NLP) embeddings. Designed to eliminate product discovery friction by combining traditional parametric filters with a conversational AI advisor.

## Key Features
- **Semantic Vector Search:** Encodes product descriptions and natural-language user queries into dense vector representations using `all-MiniLM-L6-v2` and ranks matches via cosine similarity.
- **Hybrid Filtering Architecture:** Seamlessly combines semantic intent with hard filters (price ceiling, category, keyword, and multi-channel monetization: official inventory, marketplace, and affiliate partners).
- **Session Algorithmic Memory:** Dynamically blends a 15% preference vector from the user's browsing history into subsequent queries and personalized recommendations.
- **Automated Cross-Selling:** Computes vector similarity across distinct product categories to recommend complementary items in real time.

## Tech Stack
- **AI / NLP:** Python, `sentence-transformers` (`all-MiniLM-L6-v2`), NumPy
- **Backend:** FastAPI, Uvicorn, Pydantic
- **Frontend:** Semantic HTML5, CSS Grid/Flexbox, Vanilla JavaScript (`Fetch API`)

## Local Setup

1. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate