#!/usr/bin/env bash
# One-shot setup script for the Finance Advisor project.
# Run: bash scripts/setup.sh

set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "==> Creating conda environment (finance-advisor, Python 3.11)…"
conda create -y -n finance-advisor python=3.11 2>/dev/null || true
eval "$(conda shell.bash hook)"
conda activate finance-advisor

echo "==> Installing dependencies…"
pip install -r requirements.txt

echo "==> Checking .env…"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Created .env from .env.example — FILL IN YOUR API KEYS BEFORE CONTINUING"
    echo "  GROQ_API_KEY    → https://console.groq.com"
    echo "  PINECONE_API_KEY → https://app.pinecone.io"
    echo "  TAVILY_API_KEY   → https://tavily.com"
    exit 1
fi

echo "==> Generating sample bank statement…"
python data/sample_statements/generate_sample.py

echo "==> Ingesting documents into Pinecone…"
python scripts/ingest.py --reset

echo ""
echo "✅ Setup complete! Run the app with:"
echo "   conda activate finance-advisor && streamlit run app.py"
