"""
PDF Ingestion Pipeline: Extract text → Chunk → Embed → Upsert to Pinecone.
Handles both bank statements and regulatory documents.
"""
import re
import hashlib
from pathlib import Path
from typing import List, Dict, Any

import fitz  # PyMuPDF
from loguru import logger

from src.utils.config import config


# ── Text Extraction ────────────────────────────────────────────────────────────

def extract_text_from_pdf(pdf_path: str | Path) -> Dict[str, Any]:
    """Extract raw text + metadata from a PDF file."""
    pdf_path = Path(pdf_path)
    doc = fitz.open(str(pdf_path))

    pages_text = []
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text")
        pages_text.append({"page": page_num, "text": text.strip()})

    full_text = "\n".join(p["text"] for p in pages_text)
    doc.close()

    logger.info(f"Extracted {len(pages_text)} pages from {pdf_path.name}")
    return {
        "filename": pdf_path.name,
        "full_text": full_text,
        "pages": pages_text,
        "total_pages": len(pages_text),
        "char_count": len(full_text),
    }


def extract_bank_statement_metadata(text: str) -> Dict[str, Any]:
    """Parse common fields from Indian bank statement text."""
    metadata = {}

    # Account number (partial)
    acct_match = re.search(r"(?:Account|A/C)\s*(?:No|Number)[:\s]+([X\d\s\-]{8,20})", text, re.IGNORECASE)
    if acct_match:
        metadata["account_number"] = acct_match.group(1).strip()

    # Statement period
    period_match = re.search(
        r"(?:Statement Period|From)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})"
        r"\s*(?:To|–|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",
        text, re.IGNORECASE
    )
    if period_match:
        metadata["period_from"] = period_match.group(1)
        metadata["period_to"] = period_match.group(2)

    # Opening/Closing balance
    ob_match = re.search(r"Opening Balance[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
    if ob_match:
        metadata["opening_balance"] = ob_match.group(1).replace(",", "")

    cb_match = re.search(r"Closing Balance[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
    if cb_match:
        metadata["closing_balance"] = cb_match.group(1).replace(",", "")

    return metadata


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_text(
    text: str,
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> List[str]:
    """Split text into overlapping chunks for better RAG retrieval."""
    chunk_size = chunk_size or config.CHUNK_SIZE
    chunk_overlap = chunk_overlap or config.CHUNK_OVERLAP

    # Split on sentence boundaries first
    sentences = re.split(r"(?<=[.!?])\s+|\n{2,}", text)

    chunks = []
    current_chunk = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        if len(current_chunk) + len(sentence) + 1 <= chunk_size:
            current_chunk = (current_chunk + " " + sentence).strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # Start new chunk with overlap from previous
            overlap_text = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else current_chunk
            current_chunk = (overlap_text + " " + sentence).strip()

    if current_chunk:
        chunks.append(current_chunk)

    logger.info(f"Created {len(chunks)} chunks (size={chunk_size}, overlap={chunk_overlap})")
    return chunks


def create_documents(
    extraction: Dict[str, Any],
    doc_type: str = "bank_statement",
    extra_metadata: Dict[str, Any] = None,
) -> List[Dict[str, Any]]:
    """Convert extracted PDF text into structured document chunks with metadata."""
    chunks = chunk_text(extraction["full_text"])
    extra_metadata = extra_metadata or {}

    # Parse bank statement metadata if applicable
    bank_meta = {}
    if doc_type == "bank_statement":
        bank_meta = extract_bank_statement_metadata(extraction["full_text"])

    documents = []
    for i, chunk in enumerate(chunks):
        doc_id = hashlib.md5(f"{extraction['filename']}_{i}_{chunk[:50]}".encode()).hexdigest()
        documents.append({
            "id": doc_id,
            "text": chunk,
            "metadata": {
                "source": extraction["filename"],
                "doc_type": doc_type,
                "chunk_index": i,
                "total_chunks": len(chunks),
                **bank_meta,
                **extra_metadata,
            },
        })

    return documents


# ── Batch Ingestion ───────────────────────────────────────────────────────────

def ingest_directory(
    directory: str | Path,
    doc_type: str = "bank_statement",
) -> List[Dict[str, Any]]:
    """Ingest all PDFs from a directory."""
    directory = Path(directory)
    pdf_files = list(directory.glob("*.pdf"))

    if not pdf_files:
        logger.warning(f"No PDF files found in {directory}")
        return []

    all_documents = []
    for pdf_file in pdf_files:
        try:
            extraction = extract_text_from_pdf(pdf_file)
            documents = create_documents(extraction, doc_type=doc_type)
            all_documents.extend(documents)
            logger.success(f"Ingested {pdf_file.name}: {len(documents)} chunks")
        except Exception as e:
            logger.error(f"Failed to ingest {pdf_file.name}: {e}")

    logger.info(f"Total documents created: {len(all_documents)}")
    return all_documents


def ingest_text_file(
    file_path: str | Path,
    doc_type: str = "regulation",
) -> List[Dict[str, Any]]:
    """Ingest a plain text file (e.g., SEBI regulations)."""
    file_path = Path(file_path)
    text = file_path.read_text(encoding="utf-8")

    chunks = chunk_text(text)
    documents = []
    for i, chunk in enumerate(chunks):
        doc_id = hashlib.md5(f"{file_path.name}_{i}".encode()).hexdigest()
        documents.append({
            "id": doc_id,
            "text": chunk,
            "metadata": {
                "source": file_path.name,
                "doc_type": doc_type,
                "chunk_index": i,
                "total_chunks": len(chunks),
            },
        })

    logger.info(f"Ingested text file {file_path.name}: {len(documents)} chunks")
    return documents
