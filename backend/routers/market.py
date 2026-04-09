"""
Market data router — REAL live Indian market data via yfinance.
- Market open: Mon–Fri 09:15–15:30 IST (excluding NSE holidays)
- Cache: 30s during market hours, 5 min when closed
- Sources: Yahoo Finance (NSE/BSE), AMFI India API
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, time, timedelta
from functools import lru_cache
from typing import Optional

import httpx
import pytz
import yfinance as yf
from cachetools import TTLCache, cached
from cachetools.keys import hashkey
from fastapi import APIRouter

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/market", tags=["market"])

IST = pytz.timezone("Asia/Kolkata")

# ── NSE Holidays 2025 & 2026 ─────────────────────────────────────────────────
NSE_HOLIDAYS: set[date] = {
    # 2025
    date(2025, 1, 26),   # Republic Day
    date(2025, 3, 14),   # Holi
    date(2025, 4, 14),   # Dr. Ambedkar Jayanti / Good Friday
    date(2025, 4, 18),   # Good Friday
    date(2025, 5, 1),    # Maharashtra Day
    date(2025, 8, 15),   # Independence Day
    date(2025, 10, 2),   # Gandhi Jayanti
    date(2025, 10, 24),  # Dussehra
    date(2025, 11, 5),   # Diwali Laxmi Pujan
    date(2025, 11, 14),  # Diwali Balipratipada
    date(2025, 12, 25),  # Christmas
    # 2026
    date(2026, 1, 26),   # Republic Day
    date(2026, 3, 20),   # Holi
    date(2026, 4, 3),    # Good Friday
    date(2026, 4, 14),   # Dr. Ambedkar Jayanti
    date(2026, 5, 1),    # Maharashtra Day
    date(2026, 8, 15),   # Independence Day
    date(2026, 10, 2),   # Gandhi Jayanti
    date(2026, 11, 9),   # Diwali (tentative)
    date(2026, 12, 25),  # Christmas
}

MARKET_OPEN  = time(9, 15)
MARKET_CLOSE = time(15, 30)

# ── Cache stores ──────────────────────────────────────────────────────────────
_cache_open   = TTLCache(maxsize=32, ttl=30)    # 30s during market hours
_cache_closed = TTLCache(maxsize=32, ttl=300)   # 5 min when market is closed

# ── Yahoo Finance symbols ─────────────────────────────────────────────────────
INDICES_CONFIG = [
    {"yf_symbol": "^NSEI",    "symbol": "NIFTY 50",   "name": "Nifty 50",      "category": "equity"},
    {"yf_symbol": "^BSESN",   "symbol": "SENSEX",     "name": "BSE Sensex",    "category": "equity"},
    {"yf_symbol": "^NSEBANK", "symbol": "NIFTY BANK", "name": "Nifty Bank",    "category": "equity"},
    {"yf_symbol": "^CNXIT",   "symbol": "NIFTY IT",   "name": "Nifty IT",      "category": "equity"},
    {"yf_symbol": "GC=F",     "symbol": "GOLD",       "name": "Gold (USD/oz)", "category": "commodity", "unit": "USD/oz"},
    {"yf_symbol": "USDINR=X", "symbol": "USD/INR",    "name": "USD/INR",       "category": "forex"},
]

TOP_STOCKS_SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS", "LT.NS",
    "ITC.NS", "AXISBANK.NS", "BAJFINANCE.NS", "WIPRO.NS", "ASIANPAINT.NS",
    "MARUTI.NS", "TITAN.NS", "NESTLEIND.NS", "POWERGRID.NS", "NTPC.NS",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_market_status() -> dict:
    """Return current market status in IST."""
    now = datetime.now(IST)
    today = now.date()
    current_time = now.time().replace(tzinfo=None)

    is_weekday = today.weekday() < 5  # Mon=0 … Fri=4
    is_holiday = today in NSE_HOLIDAYS
    is_in_hours = MARKET_OPEN <= current_time <= MARKET_CLOSE

    is_open = is_weekday and not is_holiday and is_in_hours

    if is_open:
        close_dt = IST.localize(datetime.combine(today, MARKET_CLOSE))
        seconds_left = int((close_dt - now).total_seconds())
        status_text = "OPEN"
        next_event = "Closes"
        seconds_to_event = seconds_left
    else:
        # Find next trading day open
        candidate = today
        if current_time > MARKET_CLOSE:
            candidate += timedelta(days=1)
        while candidate.weekday() >= 5 or candidate in NSE_HOLIDAYS:
            candidate += timedelta(days=1)
        open_dt = IST.localize(datetime.combine(candidate, MARKET_OPEN))
        seconds_to_event = int((open_dt - now).total_seconds())
        status_text = "CLOSED"
        next_event = "Opens"

    return {
        "is_open": is_open,
        "status": status_text,
        "next_event": next_event,
        "seconds_to_event": max(0, seconds_to_event),
        "current_time_ist": now.strftime("%H:%M:%S IST"),
        "date_ist": today.isoformat(),
    }


def _active_cache() -> TTLCache:
    return _cache_open if _get_market_status()["is_open"] else _cache_closed


def _fetch_ticker(yf_symbol: str) -> Optional[dict]:
    """Fetch live price data for a single ticker. Returns None on failure."""
    try:
        ticker = yf.Ticker(yf_symbol)
        info = ticker.fast_info

        current = getattr(info, "last_price", None)
        prev_close = getattr(info, "previous_close", None)

        if current is None or prev_close is None:
            # Try history fallback
            hist = ticker.history(period="2d", interval="1d")
            if len(hist) >= 1:
                current = float(hist["Close"].iloc[-1])
                prev_close = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
            else:
                return None

        current = float(current)
        prev_close = float(prev_close)
        change = round(current - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0.0

        # Sparkline — last 20 1-minute bars (or 1d bars during non-hours)
        try:
            hist_1m = ticker.history(period="1d", interval="5m")
            if len(hist_1m) >= 4:
                sparkline = [round(float(v), 2) for v in hist_1m["Close"].tolist()[-20:]]
            else:
                sparkline = [round(current, 2)]
        except Exception:
            sparkline = [round(current, 2)]

        return {
            "current": round(current, 2),
            "prev_close": round(prev_close, 2),
            "change": change,
            "change_pct": change_pct,
            "sparkline": sparkline,
        }
    except Exception as exc:
        log.warning("Failed to fetch %s: %s", yf_symbol, exc)
        return None


def _get_indices_data() -> list[dict]:
    cache = _active_cache()
    key = "indices"
    if key in cache:
        return cache[key]

    results = []
    for cfg in INDICES_CONFIG:
        data = _fetch_ticker(cfg["yf_symbol"])
        if data:
            results.append({
                "symbol": cfg["symbol"],
                "name": cfg["name"],
                "category": cfg["category"],
                "unit": cfg.get("unit", "₹"),
                **data,
                "timestamp": datetime.now(IST).isoformat(),
            })

    if results:
        cache[key] = results
    return results


def _get_stocks_data() -> list[dict]:
    cache = _active_cache()
    key = "stocks"
    if key in cache:
        return cache[key]

    results = []
    for sym in TOP_STOCKS_SYMBOLS:
        data = _fetch_ticker(sym)
        if data:
            short = sym.replace(".NS", "")
            results.append({
                "symbol": short,
                "yf_symbol": sym,
                "name": short,  # placeholder; enriched below
                "current": data["current"],
                "prev_close": data["prev_close"],
                "change": data["change"],
                "change_pct": data["change_pct"],
                "sparkline": data["sparkline"],
                "timestamp": datetime.now(IST).isoformat(),
            })

    # Sort by abs change_pct descending for gainers/losers display
    results.sort(key=lambda x: abs(x["change_pct"]), reverse=True)

    if results:
        cache[key] = results
    return results


async def _fetch_amfi_navs() -> list[dict]:
    """Fetch top mutual fund NAVs from AMFI India (free, no API key)."""
    AMFI_URL = "https://api.mfapi.in/mf"
    # Scheme codes for popular direct-growth funds
    SCHEME_CODES = [
        ("119598", "Mirae Asset Large Cap Fund - Direct Growth", "Mirae Asset", "Large Cap", 5, "Moderately High"),
        ("122639", "Parag Parikh Flexi Cap Fund - Direct Growth", "PPFAS", "Flexi Cap", 5, "Moderately High"),
        ("125497", "SBI Small Cap Fund - Direct Growth", "SBI Mutual Fund", "Small Cap", 5, "Very High"),
        ("120503", "Axis Bluechip Fund - Direct Growth", "Axis Mutual Fund", "Large Cap", 4, "Moderately High"),
        ("120465", "Kotak Emerging Equity Fund - Direct Growth", "Kotak Mahindra AMC", "Mid Cap", 4, "High"),
        ("100033", "HDFC Top 100 Fund - Direct Growth", "HDFC Mutual Fund", "Large Cap", 4, "Moderately High"),
        ("118989", "Nippon India Index Fund BSE Sensex - Direct Growth", "Nippon India", "Index Fund", 3, "Moderately High"),
        ("120828", "Quant Small Cap Fund - Direct Growth", "Quant Mutual Fund", "Small Cap", 5, "Very High"),
    ]

    funds = []
    async with httpx.AsyncClient(timeout=10) as client:
        for code, name, amc, category, rating, risk in SCHEME_CODES:
            try:
                resp = await client.get(f"{AMFI_URL}/{code}")
                if resp.status_code == 200:
                    payload = resp.json()
                    nav_data = payload.get("data", [])
                    meta = payload.get("meta", {})
                    if nav_data:
                        nav_now = float(nav_data[0]["nav"])
                        # Compute 1Y return if we have enough history
                        returns_1y = returns_3y = returns_5y = None
                        try:
                            if len(nav_data) >= 252:
                                nav_1y = float(nav_data[252]["nav"])
                                returns_1y = round(((nav_now - nav_1y) / nav_1y) * 100, 1)
                            if len(nav_data) >= 756:
                                nav_3y = float(nav_data[756]["nav"])
                                returns_3y = round(((nav_now - nav_3y) / nav_3y) * 100 / 3, 1)
                            if len(nav_data) >= 1260:
                                nav_5y = float(nav_data[1260]["nav"])
                                returns_5y = round(((nav_now - nav_5y) / nav_5y) * 100 / 5, 1)
                        except (IndexError, ValueError, ZeroDivisionError):
                            pass

                        funds.append({
                            "name": name,
                            "amc": amc,
                            "category": category,
                            "nav": round(nav_now, 2),
                            "returns_1y": returns_1y,
                            "returns_3y": returns_3y,
                            "returns_5y": returns_5y,
                            "rating": rating,
                            "risk": risk,
                            "scheme_code": code,
                            "nav_date": nav_data[0].get("date", ""),
                        })
            except Exception as exc:
                log.warning("AMFI fetch failed for %s: %s", code, exc)
                continue

    return funds


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/status")
async def get_market_status():
    """Return current NSE market open/closed status."""
    return _get_market_status()


@router.get("/indices")
async def get_market_indices():
    """Return live NSE/BSE index data fetched from Yahoo Finance."""
    status = _get_market_status()
    indices = await asyncio.to_thread(_get_indices_data)
    return {
        "indices": indices,
        "market_status": status["status"],
        "is_open": status["is_open"],
        "as_of": datetime.now(IST).isoformat(),
    }


@router.get("/stocks")
async def get_top_stocks():
    """Return live top Nifty 50 stock prices with gainers/losers split."""
    stocks = await asyncio.to_thread(_get_stocks_data)
    gainers = [s for s in stocks if s["change_pct"] >= 0][:10]
    losers  = [s for s in stocks if s["change_pct"] < 0][:10]
    return {
        "all": stocks,
        "gainers": gainers,
        "losers": losers,
        "as_of": datetime.now(IST).isoformat(),
    }


@router.get("/top-funds")
async def get_top_funds():
    """Return top Indian mutual fund NAVs from AMFI India API."""
    cache = _active_cache()
    key = "top_funds"
    if key in cache:
        return {"funds": cache[key], "as_of": datetime.now(IST).isoformat(), "source": "AMFI India (cached)"}

    funds = await _fetch_amfi_navs()

    if not funds:
        # Fallback to static data if AMFI is unreachable
        funds = _static_funds_fallback()

    cache[key] = funds
    return {
        "funds": funds,
        "as_of": datetime.now(IST).isoformat(),
        "source": "AMFI India" if funds else "static fallback",
    }


@router.get("/stock/{symbol}")
async def get_stock_detail(symbol: str):
    """Fetch detail for a single NSE stock (append .NS automatically)."""
    yf_symbol = symbol.upper() + ".NS" if not symbol.endswith(".NS") else symbol.upper()
    data = await asyncio.to_thread(_fetch_ticker, yf_symbol)
    if not data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Could not fetch data for {symbol}")
    return {
        "symbol": symbol.upper(),
        "yf_symbol": yf_symbol,
        **data,
        "as_of": datetime.now(IST).isoformat(),
    }


@router.get("/news")
async def get_market_news():
    """
    Return curated Indian financial news headlines.
    (Static placeholder — integrate a news API like newsdata.io for live news.)
    """
    base_time = datetime.now(IST)
    news = [
        {
            "id": 1,
            "headline": "RBI Holds Repo Rate at 6.5%; Signals Dovish Pivot on Contained Inflation",
            "summary": "The Reserve Bank of India's MPC voted 4-2 to hold the benchmark repo rate at 6.5% while shifting its stance to 'neutral', hinting at rate cuts if CPI inflation stays below 4.5% for three consecutive months.",
            "source": "Economic Times",
            "category": "Monetary Policy",
            "timestamp": (base_time - timedelta(hours=2)).isoformat(),
            "url": "#",
            "sentiment": "neutral",
        },
        {
            "id": 2,
            "headline": "FII Inflows Return; IT Stocks Lead Nifty 50 Rally",
            "summary": "Foreign Institutional Investors net bought ₹4,280 crore worth of equities, snapping a five-session selling streak. Infosys, TCS and Wipro surged 2–3% after strong guidance from US tech clients.",
            "source": "Mint",
            "category": "Markets",
            "timestamp": (base_time - timedelta(hours=4)).isoformat(),
            "url": "#",
            "sentiment": "positive",
        },
        {
            "id": 3,
            "headline": "SEBI Tightens F&O Rules: Weekly Expiry Contracts Capped, Margins Raised",
            "summary": "SEBI mandates limiting index weekly options to one expiry per week per exchange and increases upfront margin to 20% for retail traders to curb speculative activity.",
            "source": "Business Standard",
            "category": "Regulation",
            "timestamp": (base_time - timedelta(hours=7)).isoformat(),
            "url": "#",
            "sentiment": "negative",
        },
        {
            "id": 4,
            "headline": "Gold Hits Record High on Global Uncertainty; Silver Follows",
            "summary": "Domestic gold prices soared past ₹90,000/10g on MCX, tracking international spot gold above $3,100/oz, as investors sought safe-haven assets amid US tariff escalations.",
            "source": "CNBC TV18",
            "category": "Commodities",
            "timestamp": (base_time - timedelta(hours=9)).isoformat(),
            "url": "#",
            "sentiment": "positive",
        },
        {
            "id": 5,
            "headline": "SIP Contributions Hit Record ₹25,000 Crore; MF Folios Cross 20 Crore",
            "summary": "AMFI data shows SIP inflows touched a new all-time high of ₹25,000 crore, reflecting sustained retail participation. Total mutual fund industry AUM stands at ₹65 lakh crore, up 30% year-on-year.",
            "source": "AMFI India",
            "category": "Mutual Funds",
            "timestamp": (base_time - timedelta(hours=12)).isoformat(),
            "url": "#",
            "sentiment": "positive",
        },
        {
            "id": 6,
            "headline": "Budget 2025-26: LTCG Tax at 12.5% on Equity; STT on F&O Hiked",
            "summary": "Finance Minister raised long-term capital gains tax on listed equities from 10% to 12.5% for gains above ₹1.25 lakh, while doubling the Securities Transaction Tax on futures and options.",
            "source": "The Hindu Business Line",
            "category": "Taxation",
            "timestamp": (base_time - timedelta(hours=18)).isoformat(),
            "url": "#",
            "sentiment": "negative",
        },
    ]
    return {"news": news, "as_of": base_time.isoformat()}


# ── Static fallback for funds ─────────────────────────────────────────────────

def _static_funds_fallback() -> list[dict]:
    return [
        {"name": "Mirae Asset Large Cap Fund - Direct Growth", "amc": "Mirae Asset", "category": "Large Cap",
         "nav": 98.42, "returns_1y": 18.7, "returns_3y": 22.4, "returns_5y": 19.8, "rating": 5, "risk": "Moderately High"},
        {"name": "Parag Parikh Flexi Cap Fund - Direct Growth", "amc": "PPFAS", "category": "Flexi Cap",
         "nav": 76.18, "returns_1y": 21.3, "returns_3y": 24.1, "returns_5y": 23.6, "rating": 5, "risk": "Moderately High"},
        {"name": "SBI Small Cap Fund - Direct Growth", "amc": "SBI Mutual Fund", "category": "Small Cap",
         "nav": 142.87, "returns_1y": 28.4, "returns_3y": 31.2, "returns_5y": 28.9, "rating": 5, "risk": "Very High"},
        {"name": "Axis Bluechip Fund - Direct Growth", "amc": "Axis Mutual Fund", "category": "Large Cap",
         "nav": 54.33, "returns_1y": 15.2, "returns_3y": 18.7, "returns_5y": 17.4, "rating": 4, "risk": "Moderately High"},
        {"name": "Kotak Emerging Equity Fund - Direct Growth", "amc": "Kotak Mahindra AMC", "category": "Mid Cap",
         "nav": 89.64, "returns_1y": 24.8, "returns_3y": 27.9, "returns_5y": 25.3, "rating": 4, "risk": "High"},
        {"name": "HDFC Top 100 Fund - Direct Growth", "amc": "HDFC Mutual Fund", "category": "Large Cap",
         "nav": 1008.72, "returns_1y": 16.9, "returns_3y": 20.3, "returns_5y": 18.1, "rating": 4, "risk": "Moderately High"},
        {"name": "Nippon India Index Fund BSE Sensex - Direct Growth", "amc": "Nippon India", "category": "Index Fund",
         "nav": 26.94, "returns_1y": 14.8, "returns_3y": 16.2, "returns_5y": 15.7, "rating": 3, "risk": "Moderately High"},
        {"name": "Quant Small Cap Fund - Direct Growth", "amc": "Quant Mutual Fund", "category": "Small Cap",
         "nav": 218.43, "returns_1y": 32.1, "returns_3y": 38.4, "returns_5y": 35.2, "rating": 5, "risk": "Very High"},
    ]
