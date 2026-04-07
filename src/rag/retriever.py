"""
Pinecone vector store + Hybrid retrieval (dense + keyword BM25-style reranking).
Handles index creation, upsert, and retrieval.
"""
from typing import List, Dict, Any, Optional
from loguru import logger

from src.utils.config import config
from src.rag.embeddings import embed_texts, embed_query, get_embedding_dimension


# ── Pinecone Client ────────────────────────────────────────────────────────────

def get_pinecone_index():
    """
    Initialize Pinecone and return the index.
    Creates the index if it doesn't exist.
    Recreates the index if dimension doesn't match the embedding model.
    """
    import time
    from pinecone import Pinecone, ServerlessSpec

    pc = Pinecone(api_key=config.PINECONE_API_KEY)
    index_name = config.PINECONE_INDEX_NAME
    required_dim = get_embedding_dimension()
    existing_names = [idx.name for idx in pc.list_indexes()]

    if index_name in existing_names:
        # Check dimension matches — recreate if not
        desc = pc.describe_index(index_name)
        existing_dim = desc.dimension
        if existing_dim != required_dim:
            logger.warning(
                f"Index '{index_name}' has dimension {existing_dim} "
                f"but model requires {required_dim}. Recreating index…"
            )
            pc.delete_index(index_name)
            # Wait for deletion to propagate
            for _ in range(20):
                time.sleep(3)
                if index_name not in [i.name for i in pc.list_indexes()]:
                    break
            # Fall through to create
        else:
            logger.info(f"Using existing Pinecone index: {index_name} (dim={existing_dim})")
            return pc.Index(index_name)

    logger.info(f"Creating Pinecone index: {index_name} (dim={required_dim})")
    pc.create_index(
        name=index_name,
        dimension=required_dim,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
    # Wait for index to be ready
    for _ in range(30):
        time.sleep(2)
        info = pc.describe_index(index_name)
        if getattr(info.status, "ready", False):
            break
    logger.success(f"Index '{index_name}' ready")
    return pc.Index(index_name)


# ── Upsert ─────────────────────────────────────────────────────────────────────

def upsert_documents(
    documents: List[Dict[str, Any]],
    namespace: str = "default",
    batch_size: int = 100,
) -> int:
    """Embed and upsert documents to Pinecone in batches."""
    index = get_pinecone_index()
    total_upserted = 0

    for i in range(0, len(documents), batch_size):
        batch = documents[i : i + batch_size]
        texts = [doc["text"] for doc in batch]

        logger.info(f"Embedding batch {i // batch_size + 1} ({len(texts)} docs)...")
        embeddings = embed_texts(texts)

        vectors = [
            {
                "id": doc["id"],
                "values": embedding,
                "metadata": {**doc["metadata"], "text": doc["text"]},
            }
            for doc, embedding in zip(batch, embeddings)
        ]

        index.upsert(vectors=vectors, namespace=namespace)
        total_upserted += len(vectors)
        logger.success(f"Upserted {total_upserted}/{len(documents)} documents")

    return total_upserted


def clear_namespace(namespace: str = "default") -> None:
    """Delete all vectors in a namespace (silently skips if namespace doesn't exist)."""
    index = get_pinecone_index()
    try:
        index.delete(delete_all=True, namespace=namespace)
        logger.info(f"Cleared namespace: {namespace}")
    except Exception as e:
        if "Namespace not found" in str(e) or "404" in str(e):
            logger.info(f"Namespace '{namespace}' is empty — nothing to clear")
        else:
            raise


# ── Retrieval ──────────────────────────────────────────────────────────────────

def retrieve(
    query: str,
    top_k: int = None,
    namespace: str = "default",
    filter_metadata: Optional[Dict] = None,
) -> List[Dict[str, Any]]:
    """Dense retrieval from Pinecone."""
    top_k = top_k or config.TOP_K_RETRIEVAL
    index = get_pinecone_index()

    query_embedding = embed_query(query)
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        namespace=namespace,
        include_metadata=True,
        filter=filter_metadata,
    )

    retrieved = []
    for match in results.matches:
        retrieved.append({
            "id": match.id,
            "score": match.score,
            "text": match.metadata.get("text", ""),
            "metadata": {k: v for k, v in match.metadata.items() if k != "text"},
        })

    logger.info(f"Retrieved {len(retrieved)} docs for query: '{query[:60]}...'")
    return retrieved


def hybrid_retrieve(
    query: str,
    top_k: int = None,
    namespace: str = "default",
    filter_metadata: Optional[Dict] = None,
    alpha: float = 0.7,  # weight for dense vs sparse
) -> List[Dict[str, Any]]:
    """
    Hybrid retrieval: dense vector search + keyword overlap reranking.
    alpha=1.0 → pure dense, alpha=0.0 → pure keyword
    """
    top_k = top_k or config.TOP_K_RETRIEVAL
    dense_results = retrieve(query, top_k=top_k * 2, namespace=namespace, filter_metadata=filter_metadata)

    # Keyword reranking (simple TF-based)
    query_terms = set(query.lower().split())
    for doc in dense_results:
        text_terms = set(doc["text"].lower().split())
        keyword_score = len(query_terms & text_terms) / max(len(query_terms), 1)
        doc["hybrid_score"] = alpha * doc["score"] + (1 - alpha) * keyword_score

    # Sort by hybrid score and return top_k
    dense_results.sort(key=lambda x: x["hybrid_score"], reverse=True)
    return dense_results[:top_k]


def format_context(docs: List[Dict[str, Any]]) -> str:
    """Format retrieved docs into a context string for the LLM prompt."""
    parts = []
    for i, doc in enumerate(docs, start=1):
        source = doc["metadata"].get("source", "unknown")
        doc_type = doc["metadata"].get("doc_type", "")
        parts.append(f"[{i}] Source: {source} ({doc_type})\n{doc['text']}")
    return "\n\n---\n\n".join(parts)
