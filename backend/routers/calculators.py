"""
Calculators router — wraps LangChain financial calculator tools.
"""
import sys
import os
from fastapi import APIRouter, HTTPException
from loguru import logger

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.models import (
    SIPRequest, LumpsumRequest, XIRRRequest, TaxRequest,
    PPFRequest, EMIRequest, InflationRequest, CalculatorResponse,
)

router = APIRouter(prefix="/api/calculators", tags=["calculators"])


def _invoke_tool(tool_func, **kwargs) -> str:
    """Invoke a LangChain tool and return the string result."""
    try:
        return tool_func.invoke(kwargs)
    except Exception as e:
        logger.exception(f"Tool invocation failed: {tool_func.name}")
        raise HTTPException(status_code=500, detail=f"Calculator error: {e}")


@router.post("/sip", response_model=CalculatorResponse)
async def sip_calculator(request: SIPRequest):
    """Calculate SIP maturity value."""
    from src.tools.financial_calculators import calculate_sip
    result = _invoke_tool(
        calculate_sip,
        monthly_investment=request.monthly_investment,
        annual_return_rate=request.annual_return_rate,
        years=request.years,
    )
    return CalculatorResponse(result=result)


@router.post("/lumpsum", response_model=CalculatorResponse)
async def lumpsum_calculator(request: LumpsumRequest):
    """Calculate lumpsum investment maturity value."""
    from src.tools.financial_calculators import calculate_lumpsum
    result = _invoke_tool(
        calculate_lumpsum,
        principal=request.principal,
        annual_return_rate=request.annual_return_rate,
        years=request.years,
    )
    return CalculatorResponse(result=result)


@router.post("/xirr", response_model=CalculatorResponse)
async def xirr_calculator(request: XIRRRequest):
    """Calculate XIRR for irregular cash flows."""
    from src.tools.financial_calculators import calculate_xirr
    result = _invoke_tool(
        calculate_xirr,
        cash_flows=request.cash_flows,
        dates_str=request.dates_str,
    )
    return CalculatorResponse(result=result)


@router.post("/tax", response_model=CalculatorResponse)
async def tax_calculator(request: TaxRequest):
    """Calculate 80C tax savings under old vs new regime."""
    from src.tools.financial_calculators import calculate_80c_tax_saving
    result = _invoke_tool(
        calculate_80c_tax_saving,
        annual_income=request.annual_income,
        investments_80c=request.investments_80c,
        nps_contribution=request.nps_contribution,
        health_insurance=request.health_insurance,
        hra_exemption=request.hra_exemption,
        regime=request.regime,
    )
    return CalculatorResponse(result=result)


@router.post("/ppf", response_model=CalculatorResponse)
async def ppf_calculator(request: PPFRequest):
    """Calculate PPF maturity amount."""
    from src.tools.financial_calculators import calculate_ppf
    result = _invoke_tool(
        calculate_ppf,
        annual_investment=request.annual_investment,
        years=request.years,
        interest_rate=request.interest_rate,
    )
    return CalculatorResponse(result=result)


@router.post("/emi", response_model=CalculatorResponse)
async def emi_calculator(request: EMIRequest):
    """Calculate loan EMI."""
    from src.tools.financial_calculators import calculate_emi
    result = _invoke_tool(
        calculate_emi,
        principal=request.principal,
        annual_interest_rate=request.annual_interest_rate,
        tenure_years=request.tenure_years,
    )
    return CalculatorResponse(result=result)


@router.post("/inflation", response_model=CalculatorResponse)
async def inflation_calculator(request: InflationRequest):
    """Adjust an amount for inflation over time."""
    from src.tools.financial_calculators import adjust_for_inflation
    result = _invoke_tool(
        adjust_for_inflation,
        amount=request.amount,
        years=request.years,
        inflation_rate=request.inflation_rate,
    )
    return CalculatorResponse(result=result)
