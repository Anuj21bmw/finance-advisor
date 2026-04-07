"""
Market data router — returns realistic Indian market data with simulated live fluctuations.
"""
import random
import math
from datetime import datetime, timedelta
from fastapi import APIRouter

router = APIRouter(prefix="/api/market", tags=["market"])


def _fluctuate(base: float, pct_range: float = 0.3) -> float:
    """Add a small random fluctuation to simulate live price movement."""
    delta = base * (random.uniform(-pct_range, pct_range) / 100)
    return round(base + delta, 2)


def _sparkline(base: float, points: int = 12, volatility: float = 0.5) -> list[float]:
    """Generate a realistic sparkline (mini price history)."""
    prices = [base]
    for _ in range(points - 1):
        change = prices[-1] * random.uniform(-volatility, volatility) / 100
        prices.append(round(prices[-1] + change, 2))
    return prices


@router.get("/indices")
async def get_market_indices():
    """
    Return live-like Indian market index data with small random fluctuations.
    Data is seeded from realistic April 2025 baseline values.
    """
    indices = [
        {
            "symbol": "NIFTY 50",
            "name": "Nifty 50",
            "base": 22519.40,
            "prev_close": 22402.10,
            "category": "equity",
        },
        {
            "symbol": "SENSEX",
            "name": "BSE Sensex",
            "base": 74119.39,
            "prev_close": 73765.78,
            "category": "equity",
        },
        {
            "symbol": "NIFTY BANK",
            "name": "Nifty Bank",
            "base": 48012.55,
            "prev_close": 47832.20,
            "category": "equity",
        },
        {
            "symbol": "NIFTY IT",
            "name": "Nifty IT",
            "base": 34218.85,
            "prev_close": 34056.40,
            "category": "equity",
        },
        {
            "symbol": "GOLD",
            "name": "Gold (MCX)",
            "base": 72850.0,
            "prev_close": 72610.0,
            "category": "commodity",
            "unit": "₹/10g",
        },
        {
            "symbol": "USD/INR",
            "name": "USD/INR",
            "base": 83.47,
            "prev_close": 83.52,
            "category": "forex",
        },
    ]

    result = []
    for idx in indices:
        current = _fluctuate(idx["base"], pct_range=0.4)
        change = round(current - idx["prev_close"], 2)
        change_pct = round((change / idx["prev_close"]) * 100, 2)
        result.append({
            "symbol": idx["symbol"],
            "name": idx["name"],
            "current": current,
            "change": change,
            "change_pct": change_pct,
            "prev_close": idx["prev_close"],
            "category": idx.get("category", "equity"),
            "unit": idx.get("unit", "₹"),
            "sparkline": _sparkline(idx["base"]),
            "timestamp": datetime.now().isoformat(),
        })

    return {"indices": result, "market_status": "open", "as_of": datetime.now().isoformat()}


@router.get("/top-funds")
async def get_top_funds():
    """
    Return top 8 Indian mutual funds with NAV and return data.
    Based on realistic April 2025 data for well-known funds.
    """
    funds = [
        {
            "name": "Mirae Asset Large Cap Fund - Direct Growth",
            "category": "Large Cap",
            "amc": "Mirae Asset",
            "nav": 98.42,
            "returns_1y": 18.7,
            "returns_3y": 22.4,
            "returns_5y": 19.8,
            "rating": 5,
            "aum_cr": 38420,
            "expense_ratio": 0.52,
            "risk": "Moderately High",
        },
        {
            "name": "Parag Parikh Flexi Cap Fund - Direct Growth",
            "category": "Flexi Cap",
            "amc": "PPFAS",
            "nav": 76.18,
            "returns_1y": 21.3,
            "returns_3y": 24.1,
            "returns_5y": 23.6,
            "rating": 5,
            "aum_cr": 52180,
            "expense_ratio": 0.63,
            "risk": "Moderately High",
        },
        {
            "name": "SBI Small Cap Fund - Direct Growth",
            "category": "Small Cap",
            "amc": "SBI Mutual Fund",
            "nav": 142.87,
            "returns_1y": 28.4,
            "returns_3y": 31.2,
            "returns_5y": 28.9,
            "rating": 5,
            "aum_cr": 21340,
            "expense_ratio": 0.70,
            "risk": "Very High",
        },
        {
            "name": "Axis Bluechip Fund - Direct Growth",
            "category": "Large Cap",
            "amc": "Axis Mutual Fund",
            "nav": 54.33,
            "returns_1y": 15.2,
            "returns_3y": 18.7,
            "returns_5y": 17.4,
            "rating": 4,
            "aum_cr": 31240,
            "expense_ratio": 0.48,
            "risk": "Moderately High",
        },
        {
            "name": "Kotak Emerging Equity Fund - Direct Growth",
            "category": "Mid Cap",
            "amc": "Kotak Mahindra AMC",
            "nav": 89.64,
            "returns_1y": 24.8,
            "returns_3y": 27.9,
            "returns_5y": 25.3,
            "rating": 4,
            "aum_cr": 18760,
            "expense_ratio": 0.58,
            "risk": "High",
        },
        {
            "name": "HDFC Top 100 Fund - Direct Growth",
            "category": "Large Cap",
            "amc": "HDFC Mutual Fund",
            "nav": 1008.72,
            "returns_1y": 16.9,
            "returns_3y": 20.3,
            "returns_5y": 18.1,
            "rating": 4,
            "aum_cr": 27850,
            "expense_ratio": 0.55,
            "risk": "Moderately High",
        },
        {
            "name": "Nippon India Index Fund S&P BSE Sensex",
            "category": "Index Fund",
            "amc": "Nippon India",
            "nav": 26.94,
            "returns_1y": 14.8,
            "returns_3y": 16.2,
            "returns_5y": 15.7,
            "rating": 3,
            "aum_cr": 8430,
            "expense_ratio": 0.10,
            "risk": "Moderately High",
        },
        {
            "name": "Quant Small Cap Fund - Direct Growth",
            "category": "Small Cap",
            "amc": "Quant Mutual Fund",
            "nav": 218.43,
            "returns_1y": 32.1,
            "returns_3y": 38.4,
            "returns_5y": 35.2,
            "rating": 5,
            "aum_cr": 14590,
            "expense_ratio": 0.64,
            "risk": "Very High",
        },
    ]

    # Add small random fluctuation to NAVs
    for fund in funds:
        fund["nav"] = round(fund["nav"] + random.uniform(-0.5, 0.5), 2)

    return {"funds": funds, "as_of": datetime.now().isoformat()}


@router.get("/news")
async def get_market_news():
    """
    Return 6 recent realistic Indian financial news headlines.
    """
    base_time = datetime.now()
    news = [
        {
            "id": 1,
            "headline": "RBI Maintains Repo Rate at 6.5%, Signals Dovish Pivot Amid Growth Concerns",
            "summary": "The Reserve Bank of India's Monetary Policy Committee voted 4-2 to hold the benchmark repo rate steady at 6.5% while shifting its stance to 'neutral', hinting at possible rate cuts if inflation remains contained below 4.5% for three consecutive months.",
            "source": "Economic Times",
            "category": "Monetary Policy",
            "timestamp": (base_time - timedelta(hours=2)).isoformat(),
            "url": "#",
            "sentiment": "neutral",
        },
        {
            "id": 2,
            "headline": "Nifty 50 Rebounds 1.2% as FII Inflows Return; IT Stocks Lead Rally",
            "summary": "Foreign Institutional Investors net bought ₹4,280 crore worth of equities on Thursday, snapping a five-session selling streak. Infosys, TCS and Wipro surged 2–3% after strong Q4 guidance from US tech clients.",
            "source": "Mint",
            "category": "Markets",
            "timestamp": (base_time - timedelta(hours=4)).isoformat(),
            "url": "#",
            "sentiment": "positive",
        },
        {
            "id": 3,
            "headline": "SEBI Tightens F&O Rules: Weekly Expiry Contracts Capped, Margin Requirements Raised",
            "summary": "SEBI's new circular mandates that exchanges limit index weekly options to one expiry per week per exchange and increases upfront margin to 20% for retail traders to curb speculative activity that caused ₹1.8 lakh crore in retail losses last fiscal year.",
            "source": "Business Standard",
            "category": "Regulation",
            "timestamp": (base_time - timedelta(hours=7)).isoformat(),
            "url": "#",
            "sentiment": "negative",
        },
        {
            "id": 4,
            "headline": "Gold Hits All-Time High at ₹73,500/10g on Global Uncertainty; Silver Follows",
            "summary": "Domestic gold prices soared past the ₹73,000 mark for the first time on MCX, tracking international spot gold above $2,350/oz, as investors sought safe-haven assets amid US tariff escalations and Middle East geopolitical tensions.",
            "source": "CNBC TV18",
            "category": "Commodities",
            "timestamp": (base_time - timedelta(hours=9)).isoformat(),
            "url": "#",
            "sentiment": "positive",
        },
        {
            "id": 5,
            "headline": "SIP Contributions Hit Record ₹21,000 Crore in March 2025; MF Folios Cross 18 Crore",
            "summary": "AMFI data shows systematic investment plan (SIP) inflows touched a new all-time high of ₹21,040 crore in March, reflecting sustained retail participation. Total mutual fund industry AUM stands at ₹53.4 lakh crore, up 28% year-on-year.",
            "source": "AMFI India",
            "category": "Mutual Funds",
            "timestamp": (base_time - timedelta(hours=12)).isoformat(),
            "url": "#",
            "sentiment": "positive",
        },
        {
            "id": 6,
            "headline": "Budget 2025-26: LTCG Tax Raised to 12.5% on Equity; STT on F&O Hiked",
            "summary": "Finance Minister Nirmala Sitharaman raised long-term capital gains tax on listed equities from 10% to 12.5% for gains above ₹1.25 lakh, while doubling the Securities Transaction Tax on futures and options to improve tax buoyancy from financial markets.",
            "source": "The Hindu Business Line",
            "category": "Taxation",
            "timestamp": (base_time - timedelta(hours=18)).isoformat(),
            "url": "#",
            "sentiment": "negative",
        },
    ]

    return {"news": news, "as_of": datetime.now().isoformat()}
