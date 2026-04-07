"""
Multi-Agent Personal Finance Advisor — Streamlit UI (Production)

Key fixes vs. initial version:
- Helper functions defined BEFORE use (no NameError)
- Pipeline runs ONCE: streaming yields final state at end (no double-run)
- @st.cache_resource for embedding model + Pinecone client (no reload per rerun)
- Proper .env loading before config import
- Error messages are actionable, not generic
"""
import sys
import tempfile
from pathlib import Path

# ── Bootstrap: project root on path, .env loaded before any src import ────────
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

import streamlit as st
import plotly.express as px

# ── Page config must be the FIRST Streamlit call ──────────────────────────────
st.set_page_config(
    page_title="AI Finance Advisor — India",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded",
)

from src.utils.config import config

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%);
        padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; color: white;
    }
    .disclaimer-box {
        background: #fffbeb; border: 1px solid #f6e05e;
        border-radius: 8px; padding: 1rem; font-size: 0.85rem;
    }
    .stButton > button {
        background: linear-gradient(135deg, #2b6cb0 0%, #1a365d 100%);
        color: white; border-radius: 8px; border: none;
        padding: 0.5rem 2rem; font-weight: 600;
    }
    .stButton > button:disabled { background: #a0aec0 !important; }
</style>
""", unsafe_allow_html=True)

# ── Constants ─────────────────────────────────────────────────────────────────
AGENT_INFO = {
    "researcher": {"emoji": "🔍", "name": "Researcher",  "desc": "Fetching live market data & news"},
    "analyzer":   {"emoji": "📊", "name": "Analyzer",    "desc": "Analyzing bank statements via RAG"},
    "executor":   {"emoji": "🧮", "name": "Executor",    "desc": "Running financial calculations"},
    "planner":    {"emoji": "📋", "name": "Planner",     "desc": "Drafting investment strategy"},
    "critic":     {"emoji": "✅", "name": "Critic",      "desc": "Quality check & compliance review"},
}

OUTPUT_KEY = {
    "researcher": "research_output",
    "analyzer":   "analysis_output",
    "executor":   "execution_output",
    "planner":    "plan_output",
    "critic":     "critic_output",
}

SAMPLE_QUERIES = [
    "What are my top 3 spending categories and how can I reduce them?",
    "How should I invest ₹20,000 per month to build a retirement corpus of ₹5 crores in 20 years?",
    "Analyze my tax saving potential for this financial year",
    "Build me a complete investment plan based on my profile and spending habits",
    "Calculate the SIP needed to buy a ₹80 lakh house in 5 years",
    "Should I invest in ELSS or PPF to save tax? Compare both options.",
]

SPENDING_DEMO = {
    "Rent": 28000, "EMIs": 25500, "Investments/SIPs": 26000,
    "Food & Dining": 4600, "Groceries": 10150, "Shopping": 25398,
    "Entertainment": 2148, "Transport": 5040, "Healthcare": 4400,
    "Insurance": 35500, "Travel": 10350, "Utilities": 2698,
    "Cash Withdrawals": 8000, "Transfers": 5000,
}


# ── Cached Resources (loaded once per process, not per Streamlit rerun) ───────

@st.cache_resource(show_spinner="Loading embedding model…")
def get_cached_embedding_model():
    """sentence-transformers model — ~90 MB, loaded once."""
    from src.rag.embeddings import get_embedding_model
    return get_embedding_model()


@st.cache_resource(show_spinner="Connecting to Pinecone…")
def get_cached_pinecone_index():
    """Pinecone index client — one TCP connection reused across reruns."""
    from src.rag.retriever import get_pinecone_index
    return get_pinecone_index()


@st.cache_resource(show_spinner="Compiling LangGraph…")
def get_cached_graph():
    """Compiled LangGraph — built once, reused for all queries."""
    from src.graph.workflow import get_graph
    return get_graph()


# ── Session State ─────────────────────────────────────────────────────────────
def _init_session():
    defaults = {
        "ingested": False,
        "final_state": None,
        "agent_outputs": {},   # node_name → output text (for live display)
        "processing": False,
        "pdf_paths": [],
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v


_init_session()


# ── Helper Functions (MUST be defined before any UI code that calls them) ─────

def _ingest_documents(uploaded_files, use_sample: bool, profile: dict):
    """Ingest PDFs + regulations into Pinecone. Called from sidebar button."""
    from src.rag.pdf_ingestion import (
        extract_text_from_pdf, create_documents, ingest_text_file
    )
    from src.rag.retriever import upsert_documents, clear_namespace

    pdf_paths = []
    progress = st.progress(0, text="Preparing documents…")

    try:
        # Generate / locate sample statement
        if use_sample or not uploaded_files:
            sample_path = PROJECT_ROOT / "data/sample_statements/sample_statement_rahul_sharma.pdf"
            if not sample_path.exists():
                progress.progress(0.05, text="Generating sample bank statement…")
                from data.sample_statements.generate_sample import generate_bank_statement
                generate_bank_statement(str(sample_path))
            pdf_paths.append(str(sample_path))

        # Save uploaded files to temp dir
        if uploaded_files:
            for f in uploaded_files:
                tmp = tempfile.NamedTemporaryFile(
                    delete=False, suffix=".pdf",
                    dir=tempfile.gettempdir()
                )
                tmp.write(f.read())
                tmp.close()
                pdf_paths.append(tmp.name)

        st.session_state.pdf_paths = pdf_paths

        # Clear stale vectors
        progress.progress(0.1, text="Clearing old vectors…")
        clear_namespace("bank_statements")
        clear_namespace("regulations")

        # Ingest bank statements
        all_bank_docs = []
        for i, pdf_path in enumerate(pdf_paths):
            progress.progress(
                0.2 + 0.4 * (i / max(len(pdf_paths), 1)),
                text=f"Processing {Path(pdf_path).name}…"
            )
            extraction = extract_text_from_pdf(pdf_path)
            docs = create_documents(
                extraction, doc_type="bank_statement",
                extra_metadata={"user_age": profile.get("age")}
            )
            all_bank_docs.extend(docs)

        if all_bank_docs:
            progress.progress(0.65, text=f"Embedding {len(all_bank_docs)} chunks…")
            upserted = upsert_documents(all_bank_docs, namespace="bank_statements")
            st.info(f"Bank statements: {upserted} chunks indexed")

        # Ingest SEBI regulations
        reg_path = PROJECT_ROOT / "data/regulations/sebi_regulations.txt"
        if reg_path.exists():
            progress.progress(0.80, text="Indexing SEBI regulations…")
            reg_docs = ingest_text_file(reg_path, doc_type="regulation")
            upsert_documents(reg_docs, namespace="regulations")
            st.info(f"Regulations: {len(reg_docs)} chunks indexed")

        progress.progress(1.0, text="Done!")
        st.session_state.ingested = True
        st.session_state.agent_outputs = {}

    except Exception as e:
        progress.empty()
        st.error(f"Ingestion failed: {e}")
        st.caption(
            "Common causes: invalid PINECONE_API_KEY, wrong PINECONE_ENVIRONMENT, "
            "or Pinecone free-tier index dimension mismatch. "
            "Try deleting and recreating your Pinecone index."
        )


def _render_spending_chart():
    """Render a donut chart of the demo spending categories."""
    try:
        fig = px.pie(
            names=list(SPENDING_DEMO.keys()),
            values=list(SPENDING_DEMO.values()),
            title="Spending Distribution (Apr–Sep 2024)",
            color_discrete_sequence=px.colors.qualitative.Set3,
            hole=0.4,
        )
        fig.update_layout(showlegend=True, height=450, font=dict(size=12))
        st.plotly_chart(fig, use_container_width=True)
    except Exception:
        pass


def _run_pipeline(user_query: str, user_profile: dict):
    """
    Execute the full 5-agent pipeline with live streaming display.
    The graph runs ONCE — streaming yields per-agent updates, then the
    final '__final__' node delivers the complete merged state.
    """
    from src.graph.workflow import run_finance_advisor

    st.session_state.processing = True
    st.session_state.final_state = None
    st.session_state.agent_outputs = {}

    st.subheader("🔄 Agent Activity")

    # Pre-create one expander per agent (Streamlit requires this before the loop)
    agent_expanders = {
        aid: st.expander(f"{info['emoji']} {info['name']} — running…", expanded=False)
        for aid, info in AGENT_INFO.items()
    }
    progress_bar = st.progress(0, text="Starting pipeline…")
    total = len(AGENT_INFO)
    completed = 0

    try:
        for node_name, state_update in run_finance_advisor(
            user_query=user_query,
            uploaded_pdfs=st.session_state.pdf_paths,
            user_profile=user_profile,
            stream=True,
        ):
            if node_name == "__final__":
                # This is the complete merged state — store and stop
                st.session_state.final_state = state_update
                progress_bar.progress(1.0, text="✅ Analysis complete!")
                break

            if node_name in AGENT_INFO:
                completed += 1
                progress_bar.progress(
                    completed / total,
                    text=f"✅ {AGENT_INFO[node_name]['name']} done ({completed}/{total})…"
                )
                key = OUTPUT_KEY.get(node_name, "")
                output_text = state_update.get(key, "") or "_No output_"
                st.session_state.agent_outputs[node_name] = output_text

                with agent_expanders[node_name]:
                    st.markdown(output_text)

    except Exception as e:
        st.error(f"Pipeline error: {e}")
        st.exception(e)
    finally:
        st.session_state.processing = False

    st.rerun()


# ── UI Layout ──────────────────────────────────────────────────────────────────

# Header
st.markdown("""
<div class="main-header">
    <h1 style="margin:0; font-size:1.8rem;">💰 AI Personal Finance Advisor</h1>
    <p style="margin:0.3rem 0 0 0; opacity:0.85;">
        Personalized investment advice for Indian investors
        · Llama-3.1-8B · RAG · LangGraph · 5 Agents
    </p>
</div>
""", unsafe_allow_html=True)

# Warm up cached resources early (non-blocking spinners)
with st.sidebar:
    # Trigger cache loads so they're ready when the user clicks "Run"
    if config.PINECONE_API_KEY:
        try:
            get_cached_pinecone_index()
        except Exception:
            pass
    get_cached_embedding_model()

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Configuration")

    with st.expander("🔑 API Keys Status", expanded=True):
        checks = {
            "Groq (LLM)":         bool(config.GROQ_API_KEY),
            "Pinecone (Vector DB)": bool(config.PINECONE_API_KEY),
            "Tavily (Web Search)":  bool(config.TAVILY_API_KEY),
        }
        all_ok = True
        for label, ok in checks.items():
            st.write(f"{'✅' if ok else '❌'} {label}")
            if not ok:
                all_ok = False
        if not all_ok:
            st.warning("Edit `.env` and restart the app.")

    st.divider()

    st.header("👤 Your Profile")
    age = st.slider("Age", 22, 65, 30)
    income = st.number_input(
        "Monthly Income (₹)", min_value=10_000, max_value=500_000,
        value=85_000, step=5_000, format="%d"
    )
    risk = st.selectbox(
        "Risk Appetite", ["conservative", "moderate", "aggressive"], index=1
    )
    goals = st.multiselect(
        "Financial Goals",
        ["Retirement", "Home Purchase", "Child Education", "Wealth Building",
         "Emergency Fund", "Tax Saving", "Travel Fund"],
        default=["Wealth Building", "Tax Saving"],
    )
    horizon = st.selectbox(
        "Investment Horizon",
        ["< 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"],
        index=4,
    )
    investments_80c = st.number_input(
        "Existing 80C investments this FY (₹)",
        min_value=0, max_value=150_000, value=30_000, step=5_000,
    )

    user_profile = {
        "age": age,
        "income": income,
        "risk_appetite": risk,
        "goals": ", ".join(goals),
        "horizon": horizon,
        "investments_80c": investments_80c,
    }

    st.divider()

    st.header("📁 Documents")
    uploaded_files = st.file_uploader(
        "Upload Bank Statements (PDF)",
        type=["pdf"],
        accept_multiple_files=True,
        help="Processed locally. Never sent to third parties.",
    )
    use_sample = st.checkbox(
        "Use sample statement (demo)", value=not bool(uploaded_files)
    )

    if st.button(
        "📥 Process Documents",
        disabled=st.session_state.processing,
        use_container_width=True,
    ):
        _ingest_documents(uploaded_files, use_sample, user_profile)

    if st.session_state.ingested:
        st.success("✅ Documents ready")
        st.caption(f"{len(st.session_state.pdf_paths)} file(s) indexed")


# ── Main Query Area ───────────────────────────────────────────────────────────
col_query, col_pipeline = st.columns([2, 1])

with col_query:
    st.subheader("💬 Ask Your Financial Question")

    selected = st.selectbox(
        "Quick examples (or type your own below):",
        ["Custom question…"] + SAMPLE_QUERIES,
    )
    user_query = st.text_area(
        "Your question:",
        value="" if selected == "Custom question…" else selected,
        height=100,
        placeholder="e.g., How should I invest ₹15,000/month to retire at 45?",
    )

with col_pipeline:
    st.subheader("🤖 Agent Pipeline")
    for aid, info in AGENT_INFO.items():
        st.markdown(f"**{info['emoji']} {info['name']}** — {info['desc']}")

st.divider()

run_col, _, hint_col = st.columns([1, 2, 1])
with run_col:
    can_run = bool(user_query.strip()) and not st.session_state.processing
    if st.button("🚀 Get Investment Advice", disabled=not can_run, use_container_width=True):
        _run_pipeline(user_query, user_profile)

with hint_col:
    if not st.session_state.ingested:
        st.warning("← Process documents first")
    elif st.session_state.processing:
        st.info("Pipeline running…")


# ── Results ───────────────────────────────────────────────────────────────────
if st.session_state.final_state:
    state = st.session_state.final_state

    st.divider()
    st.subheader("📈 Your Personalized Investment Advice")

    if state.get("summary"):
        st.info(f"**Summary:** {state['summary']}")

    tab_plan, tab_analysis, tab_research, tab_calc, tab_trace = st.tabs([
        "📋 Investment Plan",
        "📊 Analysis",
        "🔍 Research",
        "🧮 Calculations",
        "🕵️ Agent Trace",
    ])

    with tab_plan:
        advice = state.get("final_advice") or state.get("plan_output") or "_No plan generated._"
        st.markdown(advice)
        if state.get("disclaimer"):
            st.markdown(
                f'<div class="disclaimer-box">{state["disclaimer"]}</div>',
                unsafe_allow_html=True,
            )

    with tab_analysis:
        if state.get("analysis_output"):
            st.markdown(state["analysis_output"])
            st.divider()
            _render_spending_chart()
        else:
            st.info("Process a bank statement PDF to see spending analysis.")

    with tab_research:
        if state.get("research_output"):
            st.markdown(state["research_output"])
        else:
            st.info("Research unavailable — check TAVILY_API_KEY in .env")

    with tab_calc:
        if state.get("execution_output"):
            st.markdown(state["execution_output"])
        tool_results = state.get("tool_results") or []
        if tool_results:
            st.subheader("Raw Calculator Results")
            for tr in tool_results:
                with st.expander(f"🧮 {tr['tool'].replace('_', ' ').title()}"):
                    st.code(tr["result"], language=None)

    with tab_trace:
        messages = state.get("messages") or []
        if not messages:
            st.info("No agent trace available.")
        for msg in messages:
            agent = msg.get("agent", "unknown")
            info = AGENT_INFO.get(agent, {"emoji": "🤖", "name": agent})
            with st.expander(f"{info['emoji']} {info['name']}"):
                st.markdown(msg.get("content") or "_No content_")
                meta = msg.get("metadata") or {}
                if meta:
                    st.json(meta)
                tool_calls = msg.get("tool_calls") or []
                if tool_calls:
                    st.caption(f"Tools used: {', '.join(t['name'] for t in tool_calls)}")


# ── Footer ────────────────────────────────────────────────────────────────────
st.divider()
st.markdown(
    "<div style='text-align:center;color:#718096;font-size:0.8rem;'>"
    "LangGraph · Llama-3.1-8B (Groq) · Pinecone · Streamlit — "
    "Not SEBI registered · Educational purposes only"
    "</div>",
    unsafe_allow_html=True,
)
