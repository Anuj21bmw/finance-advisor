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

Based on the user's query and the analysis already performed, use the available calculator tools to:
1. Run SIP projections for recommended investment amounts
2. Calculate potential tax savings under 80C/NPS/80D
3. Compute XIRR on existing investments if data is available
4. Calculate EMI for any mentioned loans
5. Project PPF/NPS corpus growth
6. Adjust future goals for inflation

IMPORTANT:
- Use realistic Indian market assumptions: equity CAGR 12%, debt 7%, inflation 6%
- Always state assumptions clearly
- Run multiple scenarios (conservative/moderate/aggressive) when possible
- Round numbers to nearest hundred for readability
- Always specify the time horizon

Available tools: SIP calculator, Lumpsum calculator, XIRR, Tax saving 80C, PPF, EMI, Inflation adjuster.
Call all relevant tools based on the user's query and analysis context.
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
        llm_with_tools = llm.bind_tools(FINANCIAL_TOOLS)

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
