"""
LangGraph Workflow — wires all 5 agents with conditional edges.

Flow:
  START → Researcher → Analyzer → Executor → Planner → Critic → (retry?) → END
                                                           ↑_______________|
"""
from typing import Literal
from loguru import logger
from langgraph.graph import StateGraph, START, END

from src.graph.state import FinanceAdvisorState, create_initial_state
from src.agents.researcher import run_researcher
from src.agents.analyzer import run_analyzer
from src.agents.executor import run_executor
from src.agents.planner import run_planner
from src.agents.critic import run_critic


# ── Conditional Edge Functions ─────────────────────────────────────────────────

def should_retry_or_end(state: FinanceAdvisorState) -> Literal["planner", "__end__"]:
    """After Critic: retry with Planner if quality is low, otherwise end."""
    if state.get("should_retry", False) and state.get("iteration", 0) < 2:
        logger.info("Critic requested retry → looping back to Planner")
        return "planner"
    logger.info("Critic approved → workflow complete")
    return END


def has_error(state: FinanceAdvisorState) -> Literal["continue", "error"]:
    """Check for critical errors that should stop the workflow."""
    if state.get("error") and not state.get("research_output"):
        return "error"
    return "continue"


# ── Graph Builder ─────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """Construct and compile the LangGraph workflow."""
    graph = StateGraph(FinanceAdvisorState)

    # Add agent nodes
    graph.add_node("researcher", run_researcher)
    graph.add_node("analyzer", run_analyzer)
    graph.add_node("executor", run_executor)
    graph.add_node("planner", run_planner)
    graph.add_node("critic", run_critic)

    # Linear edges: START → researcher → analyzer → executor → planner → critic
    graph.add_edge(START, "researcher")
    graph.add_edge("researcher", "analyzer")
    graph.add_edge("analyzer", "executor")
    graph.add_edge("executor", "planner")
    graph.add_edge("planner", "critic")

    # Conditional edge: critic → (retry to planner | end)
    graph.add_conditional_edges(
        "critic",
        should_retry_or_end,
        {"planner": "planner", END: END},
    )

    return graph.compile()


# Singleton compiled graph
_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


# ── Public API ─────────────────────────────────────────────────────────────────

def run_finance_advisor(
    user_query: str,
    uploaded_pdfs: list = None,
    user_profile: dict = None,
    stream: bool = False,
):
    """
    Main entry point to run the full multi-agent finance advisor pipeline.

    Args:
        user_query: The user's financial question
        uploaded_pdfs: List of paths to uploaded PDF files
        user_profile: Dict with age, income, risk_appetite, goals, etc.
        stream: If True, yield state updates as they happen (for live UI)

    Returns:
        Final state dict with all agent outputs and advice
    """
    graph = get_graph()
    initial_state = create_initial_state(
        user_query=user_query,
        uploaded_pdfs=uploaded_pdfs or [],
        user_profile=user_profile or {},
    )

    if stream:
        return _stream_graph(graph, initial_state)
    else:
        logger.info(f"Running finance advisor for query: '{user_query[:80]}'")
        final_state = graph.invoke(initial_state)
        logger.success("Finance advisor pipeline completed")
        return final_state


def _stream_graph(graph, initial_state):
    """Generator that yields (agent_name, state) tuples as each node completes."""
    for chunk in graph.stream(initial_state, stream_mode="updates"):
        for node_name, state_update in chunk.items():
            logger.debug(f"Node '{node_name}' completed")
            yield node_name, state_update
