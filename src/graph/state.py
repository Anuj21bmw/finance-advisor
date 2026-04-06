"""
LangGraph State Schema — shared state passed between all agents in the graph.
Uses TypedDict so LangGraph can serialize/deserialize across nodes.
"""
from typing import TypedDict, List, Dict, Any, Optional, Annotated
import operator


class AgentMessage(TypedDict):
    agent: str
    content: str
    tool_calls: Optional[List[Dict[str, Any]]]
    metadata: Optional[Dict[str, Any]]


class FinanceAdvisorState(TypedDict):
    # ── Input ──────────────────────────────────────────────────────────────────
    user_query: str                        # User's natural language question
    uploaded_pdfs: List[str]              # Paths to uploaded PDF files
    user_profile: Optional[Dict[str, Any]] # Age, income, risk appetite, goals

    # ── Agent Outputs ──────────────────────────────────────────────────────────
    research_output: Optional[str]         # Researcher: live market data + news
    analysis_output: Optional[str]         # Analyzer: RAG insights from PDFs
    execution_output: Optional[str]        # Executor: tool call results (SIP, tax calc)
    plan_output: Optional[str]             # Planner: draft investment plan
    critic_output: Optional[str]           # Critic: evaluated + disclaimered plan

    # ── Intermediate State ─────────────────────────────────────────────────────
    retrieved_docs: Optional[List[Dict[str, Any]]]   # RAG retrieved chunks
    tool_results: Optional[List[Dict[str, Any]]]     # Financial calculator outputs
    messages: Annotated[List[AgentMessage], operator.add]  # Full agent trace

    # ── Control Flow ──────────────────────────────────────────────────────────
    current_agent: Optional[str]           # Which agent is running
    error: Optional[str]                   # Error message if any agent fails
    iteration: int                         # Loop counter for retry logic
    should_retry: bool                     # Critic decided to retry

    # ── Final Output ──────────────────────────────────────────────────────────
    final_advice: Optional[str]            # Structured final advice for UI
    summary: Optional[str]                 # One-paragraph summary
    disclaimer: Optional[str]             # SEBI/AMFI regulatory disclaimer


def create_initial_state(
    user_query: str,
    uploaded_pdfs: List[str] = None,
    user_profile: Dict[str, Any] = None,
) -> FinanceAdvisorState:
    """Factory function to create a fresh initial state."""
    return FinanceAdvisorState(
        user_query=user_query,
        uploaded_pdfs=uploaded_pdfs or [],
        user_profile=user_profile or {},
        research_output=None,
        analysis_output=None,
        execution_output=None,
        plan_output=None,
        critic_output=None,
        retrieved_docs=None,
        tool_results=None,
        messages=[],
        current_agent=None,
        error=None,
        iteration=0,
        should_retry=False,
        final_advice=None,
        summary=None,
        disclaimer=None,
    )
