"""
Web search tools using Tavily API for live market data, MF NAVs, and news.
"""
from typing import List, Dict, Any
from langchain_core.tools import tool
from loguru import logger

from src.utils.config import config


def _get_tavily_client():
    from tavily import TavilyClient
    return TavilyClient(api_key=config.TAVILY_API_KEY)


@tool
def search_market_data(query: str) -> str:
    """
    Search for live Indian stock market data, mutual fund NAVs, and indices.
    Args:
        query: Search query e.g., 'Nifty 50 today', 'SBI Bluechip NAV', 'RBI repo rate'
    Returns: Summarized market information from latest web sources
    """
    try:
        client = _get_tavily_client()
        results = client.search(
            query=f"{query} India NSE BSE",
            search_depth="advanced",
            max_results=5,
            include_answer=True,
        )
        answer = results.get("answer", "")
        sources = results.get("results", [])

        output = f"Market Data: {query}\n\n"
        if answer:
            output += f"Summary: {answer}\n\n"

        output += "Sources:\n"
        for i, src in enumerate(sources[:3], 1):
            output += f"  [{i}] {src.get('title', 'N/A')}\n"
            output += f"      {src.get('content', '')[:200]}...\n\n"

        return output
    except Exception as e:
        logger.error(f"Tavily search failed: {e}")
        return f"Web search unavailable: {e}. Please check your TAVILY_API_KEY."


@tool
def search_mutual_fund_nav(fund_name: str) -> str:
    """
    Fetch current NAV and recent performance of a mutual fund.
    Args:
        fund_name: Name of the mutual fund e.g., 'Mirae Asset Large Cap', 'Axis Bluechip'
    Returns: NAV, 1Y/3Y/5Y returns, and fund category
    """
    try:
        client = _get_tavily_client()
        results = client.search(
            query=f"{fund_name} mutual fund NAV returns 2024 India",
            search_depth="advanced",
            max_results=5,
            include_answer=True,
        )
        answer = results.get("answer", "No data found.")
        sources = results.get("results", [])

        output = f"Mutual Fund: {fund_name}\n"
        output += f"Latest Info: {answer}\n\n"
        if sources:
            output += f"Source: {sources[0].get('url', 'N/A')}"

        return output
    except Exception as e:
        return f"NAV search failed: {e}"


@tool
def search_financial_news(topic: str) -> str:
    """
    Search for latest Indian financial news, RBI policy, SEBI updates, and market trends.
    Args:
        topic: News topic e.g., 'RBI rate cut 2024', 'SEBI new regulations', 'inflation India'
    Returns: Latest news summary with publication dates
    """
    try:
        client = _get_tavily_client()
        results = client.search(
            query=f"{topic} India 2024 financial news",
            search_depth="basic",
            max_results=5,
            include_answer=True,
        )
        answer = results.get("answer", "")
        sources = results.get("results", [])

        output = f"News: {topic}\n\n"
        if answer:
            output += f"Summary: {answer}\n\n"

        output += "Recent Articles:\n"
        for src in sources[:4]:
            title = src.get("title", "N/A")
            content = src.get("content", "")[:150]
            url = src.get("url", "")
            published = src.get("published_date", "")
            output += f"  • {title} ({published})\n    {content}...\n    {url}\n\n"

        return output
    except Exception as e:
        return f"News search failed: {e}"


@tool
def search_investment_regulations(query: str) -> str:
    """
    Search for SEBI regulations, RBI guidelines, and Indian investment rules.
    Args:
        query: Regulatory query e.g., 'SEBI mutual fund KYC rules', 'NPS withdrawal rules'
    Returns: Regulatory information with official source links
    """
    try:
        client = _get_tavily_client()
        results = client.search(
            query=f"{query} SEBI RBI India regulation official",
            search_depth="advanced",
            max_results=5,
            include_answer=True,
            include_domains=["sebi.gov.in", "rbi.org.in", "npscra.nsdl.co.in", "incometax.gov.in"],
        )
        answer = results.get("answer", "")
        sources = results.get("results", [])

        output = f"Regulatory Info: {query}\n\n"
        if answer:
            output += f"Summary: {answer}\n\n"

        if sources:
            output += "Official Sources:\n"
            for src in sources[:3]:
                output += f"  • {src.get('title', 'N/A')}\n"
                output += f"    {src.get('content', '')[:200]}\n\n"

        return output
    except Exception as e:
        return f"Regulation search failed: {e}"


# Tool registry for Researcher agent
SEARCH_TOOLS = [
    search_market_data,
    search_mutual_fund_nav,
    search_financial_news,
    search_investment_regulations,
]
