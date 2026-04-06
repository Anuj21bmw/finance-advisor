"""
Planner Agent — synthesizes research, analysis, and calculations into a
structured, actionable investment plan tailored for Indian users.
"""
from loguru import logger
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from src.graph.state import FinanceAdvisorState, AgentMessage
from src.utils.config import config


PLANNER_SYSTEM_PROMPT = """You are a SEBI-registered investment advisor creating personalized financial plans for Indian users.

You will receive:
1. Research data (live market conditions, fund performance, news)
2. Analysis (spending patterns and insights from bank statements)
3. Calculation results (SIP projections, tax savings, EMI figures)

Your job is to synthesize ALL of this into a comprehensive, actionable investment plan.

## Output Structure (ALWAYS follow this format):

### 1. Financial Health Summary
- Current financial position overview
- Key strengths and areas for improvement

### 2. Immediate Actions (Next 30 Days)
- Specific, concrete steps with amounts and names of instruments
- e.g., "Start ₹5,000/month SIP in Mirae Asset Large Cap Fund"

### 3. Short-Term Plan (3–12 Months)
- Emergency fund building
- Debt reduction strategy
- Tax optimization for current FY

### 4. Long-Term Investment Strategy (1–5+ Years)
- Asset allocation (equity/debt/gold split)
- Recommended instruments with rationale
- SIP schedule

### 5. Tax Optimization
- 80C investment suggestions (remaining headroom)
- NPS for additional 80CCD(1B) benefit
- HRA/home loan considerations

### 6. Risk Management
- Insurance gaps (term + health)
- Portfolio rebalancing triggers

Be specific, use Indian financial products (ELSS, PPF, NPS, SGBs, FDs), and tailor advice to the user's income and goals.
Avoid generic advice — be precise about amounts, fund names, and timelines.
"""


def run_planner(state: FinanceAdvisorState) -> FinanceAdvisorState:
    """Execute the Planner agent node in the LangGraph workflow."""
    logger.info("Planner agent started")
    state["current_agent"] = "planner"

    try:
        llm = ChatGroq(
            api_key=config.GROQ_API_KEY,
            model=config.LLM_MODEL,
            temperature=0.3,  # Slight creativity for plan generation
        )

        query = state["user_query"]
        research = state.get("research_output", "No research data.")
        analysis = state.get("analysis_output", "No analysis data.")
        calculations = state.get("execution_output", "No calculations.")
        profile = state.get("user_profile", {})

        profile_str = ""
        if profile:
            profile_str = f"""
User Profile:
- Age: {profile.get('age', 'N/A')} years
- Monthly Income: ₹{profile.get('income', 'N/A')}
- Risk Appetite: {profile.get('risk_appetite', 'moderate')}
- Financial Goals: {profile.get('goals', 'wealth building')}
- Time Horizon: {profile.get('horizon', '10+ years')}
- Existing Investments: ₹{profile.get('investments_80c', 0)} in 80C instruments
"""

        messages = [
            SystemMessage(content=PLANNER_SYSTEM_PROMPT),
            HumanMessage(
                content=f"""Create a comprehensive investment plan for this user.

USER QUERY: {query}
{profile_str}

=== MARKET RESEARCH ===
{research[:2000] if research else 'No market data available.'}

=== FINANCIAL ANALYSIS (from bank statements) ===
{analysis[:2000] if analysis else 'No analysis available.'}

=== CALCULATION RESULTS ===
{calculations[:2000] if calculations else 'No calculations available.'}

Now create a detailed, personalized investment plan following the required format."""
            ),
        ]

        response = llm.invoke(messages)
        plan = response.content

        state["plan_output"] = plan
        state["messages"].append(
            AgentMessage(
                agent="planner",
                content=plan,
                tool_calls=None,
                metadata={"plan_length": len(plan)},
            )
        )
        logger.success(f"Planner completed: {len(plan)} chars")

    except Exception as e:
        logger.error(f"Planner agent failed: {e}")
        state["plan_output"] = f"Plan generation failed: {e}"
        state["error"] = str(e)

    return state
