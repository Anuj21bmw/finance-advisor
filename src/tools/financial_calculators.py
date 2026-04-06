"""
Financial calculator tools for Indian investors.
Covers: SIP, XIRR, Lumpsum, Tax Savings (80C/NPS/PPF), EMI, Inflation adjustment.
All tools are LangChain-compatible (decorated with @tool).
"""
from typing import List
from datetime import date, datetime
import numpy as np
from scipy.optimize import brentq
from langchain_core.tools import tool


# ── SIP Calculator ─────────────────────────────────────────────────────────────

@tool
def calculate_sip(
    monthly_investment: float,
    annual_return_rate: float,
    years: int,
) -> str:
    """
    Calculate the future value of a SIP (Systematic Investment Plan).
    Args:
        monthly_investment: Monthly SIP amount in INR
        annual_return_rate: Expected annual return rate (e.g., 12 for 12%)
        years: Investment duration in years
    Returns: Formatted string with maturity amount and wealth gained
    """
    r = annual_return_rate / 100 / 12  # monthly rate
    n = years * 12  # total months

    if r == 0:
        fv = monthly_investment * n
    else:
        fv = monthly_investment * (((1 + r) ** n - 1) / r) * (1 + r)

    total_invested = monthly_investment * n
    wealth_gained = fv - total_invested

    return (
        f"SIP Analysis ({years} years @ {annual_return_rate}% p.a.):\n"
        f"  Monthly Investment : ₹{monthly_investment:,.0f}\n"
        f"  Total Invested     : ₹{total_invested:,.0f}\n"
        f"  Maturity Amount    : ₹{fv:,.0f}\n"
        f"  Wealth Gained      : ₹{wealth_gained:,.0f}\n"
        f"  Return Multiplier  : {fv/total_invested:.2f}x"
    )


# ── Lumpsum Calculator ────────────────────────────────────────────────────────

@tool
def calculate_lumpsum(
    principal: float,
    annual_return_rate: float,
    years: int,
) -> str:
    """
    Calculate future value of a one-time lumpsum investment.
    Args:
        principal: Initial investment amount in INR
        annual_return_rate: Expected annual return rate (e.g., 12 for 12%)
        years: Investment duration in years
    Returns: Formatted string with maturity value
    """
    fv = principal * (1 + annual_return_rate / 100) ** years
    profit = fv - principal

    return (
        f"Lumpsum Analysis ({years} years @ {annual_return_rate}% p.a.):\n"
        f"  Principal          : ₹{principal:,.0f}\n"
        f"  Maturity Amount    : ₹{fv:,.0f}\n"
        f"  Total Profit       : ₹{profit:,.0f}\n"
        f"  Return Multiplier  : {fv/principal:.2f}x"
    )


# ── XIRR Calculator ───────────────────────────────────────────────────────────

@tool
def calculate_xirr(
    cash_flows: List[float],
    dates_str: List[str],
) -> str:
    """
    Calculate XIRR (Extended Internal Rate of Return) for irregular cash flows.
    Args:
        cash_flows: List of cash flows (negative = investment, positive = returns)
                    e.g., [-10000, -10000, 25000]
        dates_str: Corresponding dates as strings in YYYY-MM-DD format
                   e.g., ["2022-01-01", "2022-07-01", "2023-01-01"]
    Returns: XIRR as annualized return percentage
    """
    dates = [datetime.strptime(d, "%Y-%m-%d").date() for d in dates_str]
    base_date = dates[0]
    years_elapsed = [(d - base_date).days / 365.25 for d in dates]

    def npv(rate):
        return sum(cf / (1 + rate) ** t for cf, t in zip(cash_flows, years_elapsed))

    try:
        xirr = brentq(npv, -0.999, 100.0, xtol=1e-10)
        xirr_pct = xirr * 100
        return (
            f"XIRR Calculation:\n"
            f"  Number of cash flows : {len(cash_flows)}\n"
            f"  Period               : {dates_str[0]} to {dates_str[-1]}\n"
            f"  XIRR (annualized)    : {xirr_pct:.2f}% p.a.\n"
            f"  Assessment           : {'Excellent' if xirr_pct > 15 else 'Good' if xirr_pct > 10 else 'Average' if xirr_pct > 6 else 'Below Inflation'}"
        )
    except ValueError:
        return "XIRR could not be computed. Check that cash flows have at least one sign change."


# ── Tax Saving Calculator (Section 80C) ───────────────────────────────────────

@tool
def calculate_80c_tax_saving(
    annual_income: float,
    investments_80c: float,
    nps_contribution: float = 0.0,
    health_insurance: float = 0.0,
    hra_exemption: float = 0.0,
    regime: str = "old",
) -> str:
    """
    Calculate income tax liability and savings under Indian tax law.
    Args:
        annual_income: Gross annual income in INR
        investments_80c: Total 80C investments (ELSS, PPF, LIC, etc.) max ₹1.5L
        nps_contribution: NPS contribution under 80CCD(1B), max ₹50,000
        health_insurance: Health insurance premium under 80D, max ₹25,000
        hra_exemption: HRA exemption amount
        regime: "old" or "new" tax regime
    Returns: Detailed tax computation
    """
    std_deduction = 50_000
    deduction_80c = min(investments_80c, 150_000)
    deduction_80ccd = min(nps_contribution, 50_000)
    deduction_80d = min(health_insurance, 25_000)

    if regime == "old":
        taxable_income = (
            annual_income
            - std_deduction
            - deduction_80c
            - deduction_80ccd
            - deduction_80d
            - hra_exemption
        )
        taxable_income = max(0, taxable_income)
        tax = _compute_old_regime_tax(taxable_income)
    else:
        taxable_income = annual_income - std_deduction
        taxable_income = max(0, taxable_income)
        tax = _compute_new_regime_tax(taxable_income)
        deduction_80c = deduction_80ccd = deduction_80d = 0  # not applicable

    cess = tax * 0.04
    total_tax = tax + cess

    remaining_80c = max(0, 150_000 - investments_80c)
    potential_saving = _compute_old_regime_tax(taxable_income) - _compute_old_regime_tax(
        max(0, taxable_income - remaining_80c)
    ) if regime == "old" else 0

    return (
        f"Tax Analysis (FY 2024-25, {regime.upper()} Regime):\n"
        f"  Gross Income             : ₹{annual_income:,.0f}\n"
        f"  Standard Deduction       : ₹{std_deduction:,.0f}\n"
        f"  80C Deduction            : ₹{deduction_80c:,.0f}\n"
        f"  80CCD (NPS)              : ₹{deduction_80ccd:,.0f}\n"
        f"  80D (Health Insurance)   : ₹{deduction_80d:,.0f}\n"
        f"  Taxable Income           : ₹{taxable_income:,.0f}\n"
        f"  Income Tax               : ₹{tax:,.0f}\n"
        f"  Health & Education Cess  : ₹{cess:,.0f}\n"
        f"  Total Tax Payable        : ₹{total_tax:,.0f}\n"
        f"  Effective Tax Rate       : {(total_tax/annual_income*100):.1f}%\n"
        + (f"  Additional 80C Headroom  : ₹{remaining_80c:,.0f} (saves ₹{potential_saving:,.0f})"
           if regime == "old" else "")
    )


def _compute_old_regime_tax(income: float) -> float:
    slabs = [(250_000, 0), (500_000, 0.05), (1_000_000, 0.20), (float("inf"), 0.30)]
    prev, tax = 0, 0
    for limit, rate in slabs:
        if income <= prev:
            break
        taxable = min(income, limit) - prev
        tax += taxable * rate
        prev = limit
    # Rebate u/s 87A (income ≤ 5L → nil tax)
    if income <= 500_000:
        tax = 0
    return tax


def _compute_new_regime_tax(income: float) -> float:
    slabs = [
        (300_000, 0), (600_000, 0.05), (900_000, 0.10),
        (1_200_000, 0.15), (1_500_000, 0.20), (float("inf"), 0.30),
    ]
    prev, tax = 0, 0
    for limit, rate in slabs:
        if income <= prev:
            break
        taxable = min(income, limit) - prev
        tax += taxable * rate
        prev = limit
    if income <= 700_000:
        tax = 0
    return tax


# ── PPF Calculator ─────────────────────────────────────────────────────────────

@tool
def calculate_ppf(
    annual_investment: float,
    years: int = 15,
    interest_rate: float = 7.1,
) -> str:
    """
    Calculate PPF (Public Provident Fund) maturity amount.
    Args:
        annual_investment: Yearly contribution (max ₹1,50,000)
        years: Lock-in period (minimum 15 years)
        interest_rate: Current PPF interest rate (default 7.1%)
    Returns: Maturity details with tax-free status note
    """
    annual_investment = min(annual_investment, 150_000)
    r = interest_rate / 100
    balance = 0
    total_invested = 0

    for _ in range(years):
        balance = (balance + annual_investment) * (1 + r)
        total_invested += annual_investment

    interest_earned = balance - total_invested
    return (
        f"PPF Calculator ({years} years @ {interest_rate}%):\n"
        f"  Annual Investment  : ₹{annual_investment:,.0f}\n"
        f"  Total Invested     : ₹{total_invested:,.0f}\n"
        f"  Interest Earned    : ₹{interest_earned:,.0f} (TAX FREE)\n"
        f"  Maturity Amount    : ₹{balance:,.0f}\n"
        f"  Effective Return   : {(balance/total_invested - 1)*100:.1f}%\n"
        f"  Note: PPF qualifies under Section 80C (EEE status)"
    )


# ── EMI Calculator ─────────────────────────────────────────────────────────────

@tool
def calculate_emi(
    principal: float,
    annual_interest_rate: float,
    tenure_years: int,
) -> str:
    """
    Calculate EMI for a home/car/personal loan.
    Args:
        principal: Loan amount in INR
        annual_interest_rate: Interest rate (e.g., 8.5 for 8.5%)
        tenure_years: Loan tenure in years
    Returns: Monthly EMI, total interest, and amortization summary
    """
    r = annual_interest_rate / 100 / 12
    n = tenure_years * 12

    if r == 0:
        emi = principal / n
    else:
        emi = principal * r * (1 + r) ** n / ((1 + r) ** n - 1)

    total_payment = emi * n
    total_interest = total_payment - principal

    return (
        f"EMI Calculator:\n"
        f"  Loan Amount        : ₹{principal:,.0f}\n"
        f"  Interest Rate      : {annual_interest_rate}% p.a.\n"
        f"  Tenure             : {tenure_years} years ({n} months)\n"
        f"  Monthly EMI        : ₹{emi:,.0f}\n"
        f"  Total Payment      : ₹{total_payment:,.0f}\n"
        f"  Total Interest     : ₹{total_interest:,.0f}\n"
        f"  Interest Burden    : {(total_interest/principal*100):.1f}% of principal"
    )


# ── Inflation Adjuster ────────────────────────────────────────────────────────

@tool
def adjust_for_inflation(
    amount: float,
    years: int,
    inflation_rate: float = 6.0,
) -> str:
    """
    Calculate the real value of a future amount adjusted for Indian inflation.
    Args:
        amount: Future amount in INR
        years: Number of years from now
        inflation_rate: Expected annual inflation rate (default 6% for India)
    Returns: Present value and purchasing power comparison
    """
    real_value = amount / (1 + inflation_rate / 100) ** years
    loss = amount - real_value

    return (
        f"Inflation Adjustment ({years} years @ {inflation_rate}% inflation):\n"
        f"  Future Amount      : ₹{amount:,.0f}\n"
        f"  Real Value (today) : ₹{real_value:,.0f}\n"
        f"  Purchasing Power   : {(real_value/amount*100):.1f}% of face value\n"
        f"  Value Erosion      : ₹{loss:,.0f}\n"
        f"  Tip: Your investments must beat {inflation_rate}% to preserve wealth"
    )


# ── Tool Registry ─────────────────────────────────────────────────────────────

FINANCIAL_TOOLS = [
    calculate_sip,
    calculate_lumpsum,
    calculate_xirr,
    calculate_80c_tax_saving,
    calculate_ppf,
    calculate_emi,
    adjust_for_inflation,
]
