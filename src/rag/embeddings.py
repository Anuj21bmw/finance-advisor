"""
Embedding generation using sentence-transformers (local, free, no API key needed).
Supports batch encoding for efficiency.
"""
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer
from loguru import logger

from src.utils.config import config

# Singleton model — loaded once, reused across calls
_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {config.EMBEDDING_MODEL}")
        _model = SentenceTransformer(config.EMBEDDING_MODEL)
        logger.success(f"Embedding model loaded. Dimension: {_model.get_sentence_embedding_dimension()}")
    return _model


def embed_texts(texts: List[str], batch_size: int = 64) -> List[List[float]]:
    """Encode a list of texts into embedding vectors."""
    model = get_embedding_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=len(texts) > 100,
        normalize_embeddings=True,  # cosine similarity works better
        convert_to_numpy=True,
    )
    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    """Encode a single query string."""
    model = get_embedding_model()
    embedding = model.encode(query, normalize_embeddings=True, convert_to_numpy=True)
    return embedding.tolist()


def get_embedding_dimension() -> int:
    return get_embedding_model().get_sentence_embedding_dimension()
