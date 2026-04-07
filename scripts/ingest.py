"""
Standalone ingestion script — run ONCE before starting the Streamlit app.

Usage:
    python scripts/ingest.py                         # uses sample statement
    python scripts/ingest.py --pdf path/to/stmt.pdf  # your real bank statement
    python scripts/ingest.py --reset                 # clear Pinecone first
"""
import argparse
import sys
from pathlib import Path

# Bootstrap
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

from loguru import logger
from src.utils.config import config
from src.rag.pdf_ingestion import (
    extract_text_from_pdf, create_documents, ingest_text_file
)
from src.rag.retriever import upsert_documents, clear_namespace, get_pinecone_index


def ingest_sample():
    sample_path = PROJECT_ROOT / "data/sample_statements/sample_statement_rahul_sharma.pdf"
    if not sample_path.exists():
        logger.info("Generating sample bank statement PDF…")
        from data.sample_statements.generate_sample import generate_bank_statement
        generate_bank_statement(str(sample_path))
    return str(sample_path)


def main():
    parser = argparse.ArgumentParser(description="Ingest documents into Pinecone")
    parser.add_argument("--pdf", type=str, default=None, help="Path to bank statement PDF")
    parser.add_argument("--reset", action="store_true", help="Clear Pinecone namespaces first")
    args = parser.parse_args()

    # Validate config
    if not config.PINECONE_API_KEY:
        logger.error("PINECONE_API_KEY not set. Edit .env and retry.")
        sys.exit(1)
    if not config.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set — LLM agents will fail at query time.")

    # Ensure Pinecone index exists
    logger.info("Connecting to Pinecone…")
    get_pinecone_index()

    if args.reset:
        logger.info("Clearing existing vectors…")
        clear_namespace("bank_statements")
        clear_namespace("regulations")

    # ── Bank Statement ─────────────────────────────────────────────────────────
    pdf_path = args.pdf or ingest_sample()
    logger.info(f"Processing: {pdf_path}")
    extraction = extract_text_from_pdf(pdf_path)
    docs = create_documents(extraction, doc_type="bank_statement")
    n = upsert_documents(docs, namespace="bank_statements")
    logger.success(f"Bank statement: {n} chunks → Pinecone[bank_statements]")

    # ── SEBI Regulations ───────────────────────────────────────────────────────
    reg_path = PROJECT_ROOT / "data/regulations/sebi_regulations.txt"
    if reg_path.exists():
        reg_docs = ingest_text_file(reg_path, doc_type="regulation")
        n_reg = upsert_documents(reg_docs, namespace="regulations")
        logger.success(f"Regulations: {n_reg} chunks → Pinecone[regulations]")
    else:
        logger.warning(f"Regulations file not found: {reg_path}")

    logger.success("Ingestion complete. You can now run: streamlit run app.py")


if __name__ == "__main__":
    main()
