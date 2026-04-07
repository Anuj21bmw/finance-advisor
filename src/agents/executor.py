"""
Executor Agent — uses financial calculator tools to run quantitative calculations
like SIP projections, tax savings, XIRR, EMI, and inflation adjustments.
"""
from loguru import logger
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage

from src.graph.state import FinanceAdvisorState, AgentMessage
from src.tools.financial_calculators import FINANCIAL_TOOLS
from src.utils.config import config


EXECUTOR_SYSTEM_PROMPT = """You are a quantitative financial calculator for Indian investors.

Based on the user's query and the analysis, call ONE tool at a time to compute relevant figures.

EXACT tool names you may call (use ONLY these — no others):
- calculate_sip          → SIP future value projection
- calculate_lumpsum      → one-time investment projection
- calculate_xirr         → annualized return on irregular cash flows
- calculate_80c_tax_saving → income tax + deduction analysis
- calculate_ppf          → PPF corpus projection
- calculate_emi          → loan EMI breakdown
- adjust_for_inflation   → real value of a future amount

RULES:
- Call ONE tool per response turn (Groq Llama requires sequential calls)
- Use realistic Indian assumptions: equity 12% CAGR, debt 7%, inflation 6%
- Do NOT invent tool names like calculate_nps — use calculate_ppf or calculate_sip instead
- For XIRR: dates_str must be unique (different dates), not all the same date
- Stop after 4 tool calls maximum; summarize remaining calculations in text
"""


def run_executor(state: FinanceAdvisorState) -> FinanceAdvisorState:
    """Execute the Executor agent node in the LangGraph workflow."""
    logger.info("Executor agent started")
    state["current_agent"] = "executor"

    try:
        llm = ChatGroq(
            api_key=config.GROQ_API_KEY,
            model=config.LLM_MODEL,
            temperature=0.0,  # Deterministic for calculations
        )
        # parallel_tool_calls=False is critical for Llama-3.1 on Groq:
        # without it the model concatenates all calls into one malformed string
        llm_with_tools = llm.bind_tools(FINANCIAL_TOOLS, parallel_tool_calls=False)

        query = state["user_query"]
        analysis = state.get("analysis_output", "No prior analysis.")
        profile = state.get("user_profile", {})

        profile_str = ""
        if profile:
            profile_str = f"""
User Financial Profile:
- Monthly Income: ₹{profile.get('income', 50000)}
- Age: {profile.get('age', 30)}
- Risk Appetite: {profile.get('risk_appetite', 'moderate')}
- Goals: {profile.get('goals', 'retirement, wealth building')}
- Existing 80C Investments: ₹{profile.get('investments_80c', 0)}
"""

        messages = [
            SystemMessage(content=EXECUTOR_SYSTEM_PROMPT),
            HumanMessage(
                content=f"""User Query: {query}
{profile_str}

Analysis Summary:
{analysis[:1500] if analysis else 'No analysis available.'}

Now run all relevant financial calculations using the tools available."""
            ),
        ]

        tool_results = []
        max_iterations = 5  # Allow multiple tool calls

        for iteration in range(max_iterations):
            response = llm_with_tools.invoke(messages)
            messages.append(response)

            if not response.tool_calls:
                break

            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]

                tool_fn = next((t for t in FINANCIAL_TOOLS if t.name == tool_name), None)
                if tool_fn:
                    try:
                        result = tool_fn.invoke(tool_args)
                        tool_results.append({
                            "tool": tool_name,
                            "args": tool_args,
                            "result": str(result),
                        })
                        messages.append(
                            ToolMessage(content=str(result), tool_call_id=tool_call["id"])
                        )
                        logger.info(f"Tool '{tool_name}' executed successfully")
                    except Exception as e:
                        error_msg = f"Tool {tool_name} failed: {e}"
                        messages.append(
                            ToolMessage(content=error_msg, tool_call_id=tool_call["id"])
                        )
                        logger.warning(error_msg)

        execution_summary = response.content if hasattr(response, "content") else ""

        # Format all tool results
        if tool_results:
            tool_output_str = "\n\n".join(
                f"### {tr['tool'].replace('_', ' ').title()}\n{tr['result']}"
                for tr in tool_results
            )
            execution_summary = f"{execution_summary}\n\n## Calculation Results\n{tool_output_str}"

        state["execution_output"] = execution_summary
        state["tool_results"] = tool_results
        state["messages"].append(
            AgentMessage(
                agent="executor",
                content=execution_summary,
                tool_calls=[{"name": tr["tool"], "args": tr["args"]} for tr in tool_results],
                metadata={"calculations_run": len(tool_results)},
            )
        )
        logger.success(f"Executor completed: {len(tool_results)} calculations")

    except Exception as e:
        logger.error(f"Executor agent failed: {e}")
        state["execution_output"] = f"Calculations unavailable: {e}"
        state["error"] = str(e)

    return state
