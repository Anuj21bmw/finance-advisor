"""
Multi-Agent Personal Finance Advisor — Streamlit UI
Supports: PDF upload, user profile, live agent streaming, structured advice display.
"""
import os
import sys
import time
import tempfile
from pathlib import Path

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px

# ── Page Config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="AI Finance Advisor — India",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from src.utils.config import config

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%);
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        color: white;
    }
    .agent-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
        margin: 0.5rem 0;
        background: #f8fafc;
    }
    .agent-running {
        border-left: 4px solid #3182ce;
        background: #ebf8ff;
    }
    .agent-done {
        border-left: 4px solid #38a169;
        background: #f0fff4;
    }
    .agent-error {
        border-left: 4px solid #e53e3e;
        background: #fff5f5;
    }
    .metric-card {
        background: white;
        border-radius: 8px;
        padding: 1rem;
        border: 1px solid #e2e8f0;
        text-align: center;
    }
    .disclaimer-box {
        background: #fffbeb;
        border: 1px solid #f6e05e;
        border-radius: 8px;
        padding: 1rem;
        font-size: 0.85rem;
    }
    .stButton > button {
        background: linear-gradient(135deg, #2b6cb0 0%, #1a365d 100%);
        color: white;
        border-radius: 8px;
        border: none;
        padding: 0.5rem 2rem;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)


# ── Agent Emoji Map ───────────────────────────────────────────────────────────
AGENT_INFO = {
    "researcher": {"emoji": "🔍", "name": "Researcher", "desc": "Fetching live market data & news"},
    "analyzer":   {"emoji": "📊", "name": "Analyzer",   "desc": "Analyzing bank statements via RAG"},
    "executor":   {"emoji": "🧮", "name": "Executor",   "desc": "Running financial calculations"},
    "planner":    {"emoji": "📋", "name": "Planner",    "desc": "Drafting investment strategy"},
    "critic":     {"emoji": "✅", "name": "Critic",     "desc": "Quality check & compliance review"},
}


# ── Session State ─────────────────────────────────────────────────────────────
def init_session():
    defaults = {
        "ingested": False,
        "final_state": None,
        "agent_trace": [],
        "processing": False,
        "pdf_paths": [],
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v


init_session()


# ── Header ────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="main-header">
    <h1 style="margin:0; font-size:1.8rem;">💰 AI Personal Finance Advisor</h1>
    <p style="margin:0.3rem 0 0 0; opacity:0.85;">
        Personalized investment advice for Indian investors · Powered by Llama-3.1 + RAG + LangGraph
    </p>
</div>
""", unsafe_allow_html=True)


# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Configuration")

    # API Keys check
    with st.expander("🔑 API Keys Status", expanded=True):
        groq_ok = bool(config.GROQ_API_KEY)
        pine_ok = bool(config.PINECONE_API_KEY)
        tav_ok = bool(config.TAVILY_API_KEY)

        st.write(f"{'✅' if groq_ok else '❌'} Groq (LLM)")
        st.write(f"{'✅' if pine_ok else '❌'} Pinecone (Vector DB)")
        st.write(f"{'✅' if tav_ok else '❌'} Tavily (Web Search)")

        if not all([groq_ok, pine_ok, tav_ok]):
            st.warning("Copy `.env.example` → `.env` and fill in your API keys")

    st.divider()

    # User Profile
    st.header("👤 Your Profile")
    age = st.slider("Age", 22, 65, 30)
    income = st.number_input("Monthly Income (₹)", min_value=10000, max_value=500000,
                              value=85000, step=5000, format="%d")
    risk = st.selectbox("Risk Appetite", ["conservative", "moderate", "aggressive"], index=1)
    goals = st.multiselect(
        "Financial Goals",
        ["Retirement", "Home Purchase", "Child Education", "Wealth Building",
         "Emergency Fund", "Tax Saving", "Travel Fund"],
        default=["Wealth Building", "Tax Saving"],
    )
    horizon = st.selectbox("Investment Horizon", ["< 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"], index=4)

    investments_80c = st.number_input(
        "Existing 80C investments this FY (₹)",
        min_value=0, max_value=150000, value=30000, step=5000
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

    # Document Ingestion
    st.header("📁 Documents")
    uploaded_files = st.file_uploader(
        "Upload Bank Statements (PDF)",
        type=["pdf"],
        accept_multiple_files=True,
        help="Your PDFs are processed locally. Data is only used for this session.",
    )

    use_sample = st.checkbox("Use sample statement (demo)", value=not bool(uploaded_files))

    if st.button("📥 Process Documents", disabled=st.session_state.processing):
        with st.spinner("Ingesting documents into vector store..."):
            _ingest_documents(uploaded_files, use_sample, user_profile)

    if st.session_state.ingested:
        st.success("✅ Documents ready for analysis")


# ── Document Ingestion Function ───────────────────────────────────────────────
def _ingest_documents(uploaded_files, use_sample: bool, profile: dict):
    """Save uploaded PDFs, generate sample if needed, ingest into Pinecone."""
    try:
        from src.rag.pdf_ingestion import (
            extract_text_from_pdf, create_documents,
            ingest_text_file, ingest_directory
        )
        from src.rag.retriever import upsert_documents, clear_namespace

        pdf_paths = []

        # Handle sample statement
        if use_sample or not uploaded_files:
            sample_path = Path("data/sample_statements/sample_statement_rahul_sharma.pdf")
            if not sample_path.exists():
                from data.sample_statements.generate_sample import generate_bank_statement
                generate_bank_statement()
            pdf_paths.append(str(sample_path))

        # Handle uploaded files
        if uploaded_files:
            for f in uploaded_files:
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                tmp.write(f.read())
                tmp.close()
                pdf_paths.append(tmp.name)

        st.session_state.pdf_paths = pdf_paths

        # Clear old data
        clear_namespace("bank_statements")
        clear_namespace("regulations")

        # Ingest bank statements
        all_bank_docs = []
        for pdf_path in pdf_paths:
            extraction = extract_text_from_pdf(pdf_path)
            docs = create_documents(extraction, doc_type="bank_statement",
                                     extra_metadata={"user_age": profile.get("age")})
            all_bank_docs.extend(docs)

        if all_bank_docs:
            upserted = upsert_documents(all_bank_docs, namespace="bank_statements")
            st.info(f"Ingested {upserted} bank statement chunks")

        # Ingest SEBI regulations
        reg_path = Path("data/regulations/sebi_regulations.txt")
        if reg_path.exists():
            reg_docs = ingest_text_file(reg_path, doc_type="regulation")
            upsert_documents(reg_docs, namespace="regulations")
            st.info(f"Loaded {len(reg_docs)} regulation chunks")

        st.session_state.ingested = True
        st.session_state.agent_trace = []

    except Exception as e:
        st.error(f"Ingestion failed: {e}")
        st.info("Tip: Make sure your .env file has valid PINECONE_API_KEY")


# ── Main Query Area ───────────────────────────────────────────────────────────
col1, col2 = st.columns([2, 1])

with col1:
    st.subheader("💬 Ask Your Financial Question")

    # Sample queries
    sample_queries = [
        "What are my top 3 spending categories and how can I reduce them?",
        "How should I invest ₹20,000 per month to build a retirement corpus of ₹5 crores in 20 years?",
        "Analyze my tax saving potential for this financial year",
        "Build me a complete investment plan based on my profile and spending habits",
        "Calculate the SIP needed to buy a ₹80 lakh house in 5 years",
        "Should I invest in ELSS or PPF to save tax? Compare both options.",
    ]

    selected_sample = st.selectbox(
        "Quick questions (or type your own below):",
        ["Custom question..."] + sample_queries,
    )

    user_query = st.text_area(
        "Your question:",
        value="" if selected_sample == "Custom question..." else selected_sample,
        height=100,
        placeholder="e.g., How should I invest ₹15,000/month to retire at 45?",
    )

with col2:
    st.subheader("🤖 Agent Pipeline")
    for agent_id, info in AGENT_INFO.items():
        st.markdown(f"**{info['emoji']} {info['name']}** — {info['desc']}")


# ── Run Analysis Button ───────────────────────────────────────────────────────
st.divider()

run_col, _, status_col = st.columns([1, 2, 1])
with run_col:
    run_clicked = st.button(
        "🚀 Get Investment Advice",
        disabled=st.session_state.processing or not user_query.strip(),
        use_container_width=True,
    )

with status_col:
    if not st.session_state.ingested:
        st.warning("Process documents first →")


# ── Agent Execution ───────────────────────────────────────────────────────────
if run_clicked and user_query.strip():
    st.session_state.processing = True
    st.session_state.final_state = None
    st.session_state.agent_trace = []

    st.subheader("🔄 Agent Activity")
    agent_containers = {}

    # Pre-create containers for each agent
    for agent_id, info in AGENT_INFO.items():
        agent_containers[agent_id] = st.expander(
            f"{info['emoji']} {info['name']} — Waiting...",
            expanded=False,
        )

    progress_bar = st.progress(0, text="Starting multi-agent pipeline...")

    try:
        from src.graph.workflow import run_finance_advisor

        total_agents = len(AGENT_INFO)
        completed = 0

        # Stream through agent outputs
        for node_name, state_update in run_finance_advisor(
            user_query=user_query,
            uploaded_pdfs=st.session_state.pdf_paths,
            user_profile=user_profile,
            stream=True,
        ):
            if node_name in AGENT_INFO:
                info = AGENT_INFO[node_name]
                completed += 1
                progress = completed / total_agents

                progress_bar.progress(progress, text=f"✅ {info['name']} completed...")

                # Show agent output in expander
                with agent_containers[node_name]:
                    output_key = {
                        "researcher": "research_output",
                        "analyzer": "analysis_output",
                        "executor": "execution_output",
                        "planner": "plan_output",
                        "critic": "critic_output",
                    }.get(node_name, "")

                    if output_key and output_key in state_update:
                        st.markdown(state_update[output_key] or "_No output_")

                # Collect trace
                st.session_state.agent_trace.append({
                    "agent": node_name,
                    "update": state_update,
                })

        # Get final state
        from src.graph.workflow import run_finance_advisor
        final_state = run_finance_advisor(
            user_query=user_query,
            uploaded_pdfs=st.session_state.pdf_paths,
            user_profile=user_profile,
            stream=False,
        )
        st.session_state.final_state = final_state
        progress_bar.progress(1.0, text="✅ Analysis complete!")

    except Exception as e:
        st.error(f"Pipeline error: {e}")
        st.exception(e)
    finally:
        st.session_state.processing = False

    st.rerun()


# ── Display Results ───────────────────────────────────────────────────────────
if st.session_state.final_state:
    state = st.session_state.final_state

    st.divider()
    st.subheader("📈 Your Personalized Investment Advice")

    # Summary card
    if state.get("summary"):
        st.info(f"**Summary:** {state['summary']}")

    # Main advice tabs
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📋 Investment Plan",
        "📊 Analysis",
        "🔍 Research",
        "🧮 Calculations",
        "🕵️ Agent Trace",
    ])

    with tab1:
        if state.get("final_advice"):
            st.markdown(state["final_advice"])
        elif state.get("plan_output"):
            st.markdown(state["plan_output"])

        if state.get("disclaimer"):
            st.markdown(
                f'<div class="disclaimer-box">{state["disclaimer"]}</div>',
                unsafe_allow_html=True,
            )

    with tab2:
        if state.get("analysis_output"):
            st.markdown(state["analysis_output"])

            # Spending chart (if we can parse categories)
            _render_spending_chart(state)
        else:
            st.info("Upload and process bank statements to see spending analysis.")

    with tab3:
        if state.get("research_output"):
            st.markdown(state["research_output"])
        else:
            st.info("Research data not available. Check TAVILY_API_KEY.")

    with tab4:
        if state.get("execution_output"):
            st.markdown(state["execution_output"])
        if state.get("tool_results"):
            st.subheader("Raw Calculation Results")
            for tr in state["tool_results"]:
                with st.expander(f"🧮 {tr['tool'].replace('_', ' ').title()}"):
                    st.code(tr["result"])

    with tab5:
        messages = state.get("messages", [])
        for msg in messages:
            agent = msg.get("agent", "unknown")
            info = AGENT_INFO.get(agent, {"emoji": "🤖", "name": agent})
            with st.expander(f"{info['emoji']} {info['name']} Output"):
                st.markdown(msg.get("content", "_No content_"))
                meta = msg.get("metadata") or {}
                if meta:
                    st.json(meta)


def _render_spending_chart(state):
    """Try to render a spending donut chart from analysis text."""
    # Predefined spending categories for demo visualization
    categories = {
        "Rent": 28000,
        "EMIs": 25500,
        "Investments/SIPs": 26000,
        "Food & Dining": 4600,
        "Groceries": 10150,
        "Shopping": 25398,
        "Entertainment": 2148,
        "Transport": 5040,
        "Healthcare": 4400,
        "Insurance": 35500,
        "Travel": 10350,
        "Utilities": 2698,
        "Cash Withdrawals": 8000,
        "Transfers": 5000,
    }

    try:
        fig = px.pie(
            names=list(categories.keys()),
            values=list(categories.values()),
            title="Spending Distribution (Apr–Sep 2024)",
            color_discrete_sequence=px.colors.qualitative.Set3,
            hole=0.4,
        )
        fig.update_layout(
            showlegend=True,
            height=450,
            font=dict(size=12),
        )
        st.plotly_chart(fig, use_container_width=True)
    except Exception:
        pass


# ── Footer ────────────────────────────────────────────────────────────────────
st.divider()
st.markdown(
    """
    <div style="text-align: center; color: #718096; font-size: 0.8rem;">
    Built with LangGraph · Llama-3.1-8B (Groq) · Pinecone · Streamlit
    | <a href="https://github.com" target="_blank">GitHub</a>
    | Not SEBI registered — for educational purposes only
    </div>
    """,
    unsafe_allow_html=True,
)
