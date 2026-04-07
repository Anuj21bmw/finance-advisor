# Multi-Agent Personal Finance Advisor

> Personalized investment advice for Indian users using bank statements + live market data + regulatory knowledge.

**Tech Stack**: LangGraph · Llama-3.1-8B (Groq) · Pinecone · Streamlit · Sentence-Transformers

---

## Architecture

```
User Query + PDF
       │
       ▼
┌─────────────────────────────────────────────────────┐
│                  LangGraph Workflow                  │
│                                                     │
│  ┌────────────┐    ┌────────────┐    ┌───────────┐  │
│  │ Researcher │───▶│  Analyzer  │───▶│ Executor  │  │
│  │ (Tavily)   │    │(RAG+Pineco)│    │(Calculators│  │
│  └────────────┘    └────────────┘    └─────┬─────┘  │
│                                            │        │
│                    ┌───────────────────────▼──────┐ │
│                    │         Planner               │ │
│                    │  (Investment Strategy Draft)  │ │
│                    └───────────────────┬──────────┘ │
│                                        │            │
│                    ┌───────────────────▼──────────┐ │
│                    │          Critic               │ │
│                    │  (QA + SEBI Disclaimer)       │ │
│                    └───────────────────┬──────────┘ │
│                                        │            │
│                           retry if quality < 6      │
└────────────────────────────────────────┼────────────┘
                                         │
                                         ▼
                              Structured Advice + Disclaimer
```

## Agents

| Agent | Role | Tools |
|-------|------|-------|
| 🔍 **Researcher** | Live market data, MF NAVs, news | Tavily Search |
| 📊 **Analyzer** | RAG on bank statements + regulations | Pinecone Hybrid Search |
| 🧮 **Executor** | Financial calculations | SIP, XIRR, 80C, PPF, EMI calculators |
| 📋 **Planner** | Synthesize → investment plan | Llama-3.1-8B via Groq |
| ✅ **Critic** | Quality check, SEBI compliance | Self-evaluation prompts |

## Setup

### 1. Clone & Create Environment

```bash
git clone <your-repo>
cd finance-advisor
conda create -n finance-advisor python=3.11
conda activate finance-advisor
pip install -r requirements.txt
```

### 2. Configure API Keys

```bash
cp .env.example .env
# Edit .env with your keys:
# - GROQ_API_KEY      → https://console.groq.com (free)
# - PINECONE_API_KEY  → https://app.pinecone.io (free tier)
# - TAVILY_API_KEY    → https://tavily.com (free tier)
```

### 3. Generate Sample Bank Statement

```bash
python data/sample_statements/generate_sample.py
```

### 4. Run the App

```bash
streamlit run app.py
```

Open http://localhost:8501

## Features

- **PDF Upload**: Upload real bank statements (data stays local)
- **RAG Pipeline**: Hybrid dense+keyword search on your financial data
- **5 Specialized Agents**: Each with a focused role, chained via LangGraph
- **Financial Calculators**: SIP, XIRR, PPF, EMI, Tax savings (80C/NPS/80D)
- **Live Market Data**: Real-time NSE/BSE data, MF NAVs via Tavily
- **SEBI Compliance**: Regulatory knowledge base + mandatory disclaimers
- **Agent Trace**: Full transparency — see what each agent did
- **Evaluation**: RAGAS metrics for RAG quality measurement

## Project Structure

```
finance-advisor/
├── app.py                          # Streamlit UI
├── requirements.txt
├── Dockerfile                      # For HuggingFace Spaces
├── .env.example
├── src/
│   ├── agents/
│   │   ├── researcher.py           # Web search agent
│   │   ├── analyzer.py             # RAG analysis agent
│   │   ├── executor.py             # Tool calling agent
│   │   ├── planner.py              # Strategy planner agent
│   │   └── critic.py               # Self-evaluation agent
│   ├── graph/
│   │   ├── state.py                # TypedDict state schema
│   │   └── workflow.py             # LangGraph wiring
│   ├── rag/
│   │   ├── pdf_ingestion.py        # PDF → chunks
│   │   ├── embeddings.py           # sentence-transformers
│   │   └── retriever.py            # Pinecone hybrid search
│   ├── tools/
│   │   ├── financial_calculators.py # SIP, XIRR, 80C, PPF, EMI
│   │   └── web_search.py           # Tavily search tools
│   └── utils/
│       └── config.py               # Environment config
├── data/
│   ├── sample_statements/
│   │   └── generate_sample.py      # Fake bank statement generator
│   └── regulations/
│       └── sebi_regulations.txt    # SEBI/80C/NPS/PPF knowledge base
├── evaluation/
│   └── ragas_eval.py               # RAGAS + custom metrics
└── notebooks/
    └── test_rag.ipynb              # Step-by-step testing
```

## Deploy to HuggingFace Spaces

1. Create a new Space (Streamlit SDK)
2. Push this repo
3. Add secrets in Space Settings:
   - `GROQ_API_KEY`
   - `PINECONE_API_KEY`
   - `TAVILY_API_KEY`

Or use Docker:
```bash
docker build -t finance-advisor .
docker run -p 7860:7860 --env-file .env finance-advisor
```

## Evaluation

```bash
# Custom metrics (no extra API key needed)
python evaluation/ragas_eval.py --mode custom

# Full RAGAS evaluation
python evaluation/ragas_eval.py --mode ragas
```

## Sample Questions to Try

1. "What are my top 3 spending categories and how can I reduce them?"
2. "How should I invest ₹20,000/month to build ₹5 crore in 20 years?"
3. "How much tax can I save this year using 80C and NPS?"
4. "Should I invest in ELSS or PPF — compare both for my income?"
5. "Calculate SIP needed to buy a ₹80 lakh house in 5 years"

## Disclaimer

This tool is for **educational purposes only**. Not SEBI-registered. Always consult a qualified SEBI-registered investment adviser before making financial decisions.

---

Built with LangGraph + Llama-3.1-8B + Pinecone + Streamlit
