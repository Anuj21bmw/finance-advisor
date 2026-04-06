"""
Researcher Agent — fetches live market data, MF NAVs, news, and regulations
using Tavily web search tools.
"""
from loguru import logger
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from src.graph.state import FinanceAdvisorState, AgentMessage
from src.tools.web_search import SEARCH_TOOLS
from src.utils.config import config


RESEARCHER_SYSTEM_PROMPT = """You are a financial research specialist focused on Indian markets.
Your job is to gather the most relevant and current market information to answer the user's query.

You have access to search tools that can find:
- Live stock prices and index levels (Nifty 50, Sensex, Bank Nifty)
- Mutual fund NAVs and returns across timeframes
- RBI monetary policy and repo rates
- SEBI regulatory updates
- Economic indicators (CPI inflation, GDP growth)
- Latest financial news

Guidelines:
1. Always search for data relevant to the user's specific question
2. Prioritize official sources (NSE, BSE, SEBI, RBI, AMFI)
3. Report numbers with dates so recency is clear
4. Note any market risks or volatility conditions
5. Be precise — avoid vague statements like "markets are doing well"

Search for the most relevant information, then summarize your findings clearly.
"""


def run_researcher(state: FinanceAdvisorState) -> FinanceAdvisorState:
    """Execute the Researcher agent node in the LangGraph workflow."""
    logger.info("Researcher agent started")
    state["current_agent"] = "researcher"

    try:
        llm = ChatGroq(
            api_key=config.GROQ_API_KEY,
            model=config.LLM_MODEL,
            temperature=0.1,
        )
        llm_with_tools = llm.bind_tools(SEARCH_TOOLS)

        query = state["user_query"]
        profile = state.get("user_profile", {})
        profile_context = ""
        if profile:
            profile_context = (
                f"\nUser Profile: Age={profile.get('age', 'N/A')}, "
                f"Income=₹{profile.get('income', 'N/A')}, "
                f"Risk={profile.get('risk_appetite', 'moderate')}"
            )

        messages = [
            SystemMessage(content=RESEARCHER_SYSTEM_PROMPT),
            HumanMessage(content=f"User Query: {query}{profile_context}\n\nSearch for relevant market data and information."),
        ]

        # Agentic loop: let LLM call tools until it's satisfied
        tool_results = []
        max_iterations = 3

        for _ in range(max_iterations):
            response = llm_with_tools.invoke(messages)
            messages.append(response)

            if not response.tool_calls:
                break

            # Execute tool calls
            from langchain_core.messages import ToolMessage
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]

                # Find and invoke the matching tool
                tool_fn = next((t for t in SEARCH_TOOLS if t.name == tool_name), None)
                if tool_fn:
                    result = tool_fn.invoke(tool_args)
                    tool_results.append({"tool": tool_name, "result": result})
                    messages.append(
                        ToolMessage(content=str(result), tool_call_id=tool_call["id"])
                    )

        research_summary = response.content if hasattr(response, "content") else str(response)

        state["research_output"] = research_summary
        state["messages"].append(
            AgentMessage(
                agent="researcher",
                content=research_summary,
                tool_calls=[{"name": tr["tool"]} for tr in tool_results],
                metadata={"tools_used": len(tool_results)},
            )
        )
        logger.success(f"Researcher completed: {len(tool_results)} tool calls, {len(research_summary)} chars")

    except Exception as e:
        logger.error(f"Researcher agent failed: {e}")
        state["research_output"] = f"Research unavailable: {e}"
        state["error"] = str(e)

    return state
