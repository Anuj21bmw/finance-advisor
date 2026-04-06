"""
Analyzer Agent — performs RAG retrieval on uploaded bank statement PDFs and
regulation documents to extract spending patterns, income analysis, and compliance info.
"""
from loguru import logger
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from src.graph.state import FinanceAdvisorState, AgentMessage
from src.rag.retriever import hybrid_retrieve, format_context
from src.utils.config import config


ANALYZER_SYSTEM_PROMPT = """You are a senior financial analyst specializing in personal finance for Indian users.
You have access to the user's bank statements and relevant financial regulations retrieved from a knowledge base.

Your job is to analyze this information and extract:
1. **Spending Patterns**: Top expense categories (food, rent, EMIs, entertainment, utilities)
2. **Income Analysis**: Salary credits, freelance income, investment returns
3. **Savings Rate**: Monthly savings as % of income
4. **Debt Assessment**: EMIs, credit card spends, outstanding loans visible in statements
5. **Investment Activity**: SIPs, MF purchases, stock trading visible in statements
6. **Regulatory Compliance**: Are deductions like 80C/NPS being maximized?
7. **Key Observations**: Unusual transactions, irregular income, spending spikes

Be specific with numbers. Quote amounts from the retrieved context.
Always note the data period (which months the statement covers).

Format your response with clear sections and bullet points.
"""


def run_analyzer(state: FinanceAdvisorState) -> FinanceAdvisorState:
    """Execute the Analyzer agent node in the LangGraph workflow."""
    logger.info("Analyzer agent started")
    state["current_agent"] = "analyzer"

    try:
        query = state["user_query"]
        profile = state.get("user_profile", {})

        # Retrieve relevant chunks from Pinecone
        # Search both bank statements and regulations
        bank_docs = hybrid_retrieve(
            query=query,
            top_k=config.TOP_K_RETRIEVAL,
            namespace="bank_statements",
        )
        reg_docs = hybrid_retrieve(
            query=f"SEBI regulations 80C NPS PPF {query}",
            top_k=3,
            namespace="regulations",
        )

        all_docs = bank_docs + reg_docs
        state["retrieved_docs"] = all_docs

        if not all_docs:
            state["analysis_output"] = (
                "No bank statement data found. Please upload your bank statement PDF "
                "and click 'Process Documents' before asking analysis questions."
            )
            return state

        context = format_context(all_docs)
        bank_context = format_context(bank_docs) if bank_docs else "No bank data."
        reg_context = format_context(reg_docs) if reg_docs else "No regulatory data."

        llm = ChatGroq(
            api_key=config.GROQ_API_KEY,
            model=config.LLM_MODEL,
            temperature=0.1,
        )

        profile_str = ""
        if profile:
            profile_str = f"""
User Profile:
- Age: {profile.get('age', 'N/A')}
- Monthly Income: ₹{profile.get('income', 'N/A')}
- Risk Appetite: {profile.get('risk_appetite', 'moderate')}
- Financial Goals: {profile.get('goals', 'wealth building')}
"""

        messages = [
            SystemMessage(content=ANALYZER_SYSTEM_PROMPT),
            HumanMessage(
                content=f"""Analyze the following data and answer the user's query.

User Query: {query}
{profile_str}

=== BANK STATEMENT DATA ===
{bank_context}

=== REGULATORY KNOWLEDGE BASE ===
{reg_context}

Provide a detailed financial analysis based on the above data."""
            ),
        ]

        response = llm.invoke(messages)
        analysis = response.content

        state["analysis_output"] = analysis
        state["messages"].append(
            AgentMessage(
                agent="analyzer",
                content=analysis,
                tool_calls=None,
                metadata={
                    "docs_retrieved": len(all_docs),
                    "bank_docs": len(bank_docs),
                    "reg_docs": len(reg_docs),
                },
            )
        )
        logger.success(f"Analyzer completed: {len(all_docs)} docs retrieved, {len(analysis)} chars")

    except Exception as e:
        logger.error(f"Analyzer agent failed: {e}")
        state["analysis_output"] = f"Analysis failed: {e}"
        state["error"] = str(e)

    return state
