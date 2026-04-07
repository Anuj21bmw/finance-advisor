"""
LangGraph Workflow — wires all 5 agents with conditional edges.

Flow:
  START → Researcher → Analyzer → Executor → Planner → Critic → (retry?) → END
                                                           ↑_______________|
"""
from typing import Literal, Generator, Tuple, Any
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


# ── Graph Builder ─────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """Construct and compile the LangGraph workflow."""
    graph = StateGraph(FinanceAdvisorState)

    graph.add_node("researcher", run_researcher)
    graph.add_node("analyzer", run_analyzer)
    graph.add_node("executor", run_executor)
    graph.add_node("planner", run_planner)
    graph.add_node("critic", run_critic)

    graph.add_edge(START, "researcher")
    graph.add_edge("researcher", "analyzer")
    graph.add_edge("analyzer", "executor")
    graph.add_edge("executor", "planner")
    graph.add_edge("planner", "critic")

    graph.add_conditional_edges(
        "critic",
        should_retry_or_end,
        {"planner": "planner", END: END},
    )

    return graph.compile()


# Singleton compiled graph — built once per process
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
    Run the full multi-agent finance advisor pipeline.

    Args:
        user_query: User's natural language question.
        uploaded_pdfs: Paths to uploaded PDF files.
        user_profile: Dict with age, income, risk_appetite, goals, etc.
        stream: If True, returns a generator yielding (node_name, state_update)
                tuples. The LAST yielded tuple will have node_name="__final__"
                and contain the complete merged final state — no second call needed.

    Returns:
        Final FinanceAdvisorState (stream=False) or Generator (stream=True).
    """
    graph = get_graph()
    initial_state = create_initial_state(
        user_query=user_query,
        uploaded_pdfs=uploaded_pdfs or [],
        user_profile=user_profile or {},
    )

    if stream:
        return _stream_graph(graph, initial_state)

    logger.info(f"Running finance advisor: '{user_query[:80]}'")
    final_state = graph.invoke(initial_state)
    logger.success("Finance advisor pipeline completed")
    return final_state


def _stream_graph(
    graph, initial_state: FinanceAdvisorState
) -> Generator[Tuple[str, Any], None, None]:
    """
    Generator that yields (node_name, state_update) as each agent completes.
    After all nodes finish, yields ("__final__", merged_final_state) so the
    caller never needs to run the graph a second time.
    """
    # Accumulate all partial updates to reconstruct the final state
    merged: dict = dict(initial_state)

    for chunk in graph.stream(initial_state, stream_mode="updates"):
        for node_name, state_update in chunk.items():
            logger.debug(f"Node '{node_name}' completed")
            # Deep-merge: state_update overrides only keys it sets
            for k, v in state_update.items():
                if v is not None:
                    merged[k] = v
            yield node_name, state_update

    # Final yield — the caller uses this as the complete result
    yield "__final__", merged
