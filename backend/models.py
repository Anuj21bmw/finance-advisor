"""
Pydantic v2 models for Finance Advisor API.
"""
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


# ── User Profile ───────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    age: int = Field(default=30, ge=18, le=80)
    income: float = Field(default=1200000.0, description="Annual income in INR")
    risk_appetite: str = Field(default="moderate", description="low | moderate | high")
    goals: List[str] = Field(default_factory=lambda: ["retirement", "wealth_creation"])
    horizon: int = Field(default=10, ge=1, le=40, description="Investment horizon in years")
    investments_80c: float = Field(default=0.0, description="Current 80C investments in INR")


# ── Advisor ────────────────────────────────────────────────────────────────────

class AdvisorRequest(BaseModel):
    query: str
    user_profile: Optional[UserProfile] = None
    uploaded_pdfs: List[str] = Field(default_factory=list)


class AdvisorResponse(BaseModel):
    summary: Optional[str] = None
    final_advice: Optional[str] = None
    research_output: Optional[str] = None
    analysis_output: Optional[str] = None
    execution_output: Optional[str] = None
    plan_output: Optional[str] = None
    disclaimer: Optional[str] = None
    tool_results: Optional[List[Dict[str, Any]]] = None
    messages: Optional[List[Dict[str, Any]]] = None


# ── Calculator Requests ────────────────────────────────────────────────────────

class SIPRequest(BaseModel):
    monthly_investment: float = Field(gt=0)
    annual_return_rate: float = Field(gt=0, le=50)
    years: int = Field(gt=0, le=50)


class LumpsumRequest(BaseModel):
    principal: float = Field(gt=0)
    annual_return_rate: float = Field(gt=0, le=50)
    years: int = Field(gt=0, le=50)


class XIRRRequest(BaseModel):
    cash_flows: List[float]
    dates_str: List[str]


class TaxRequest(BaseModel):
    annual_income: float = Field(gt=0)
    investments_80c: float = Field(default=0.0, ge=0)
    nps_contribution: float = Field(default=0.0, ge=0)
    health_insurance: float = Field(default=0.0, ge=0)
    hra_exemption: float = Field(default=0.0, ge=0)
    regime: str = Field(default="old", description="old | new")


class PPFRequest(BaseModel):
    annual_investment: float = Field(gt=0)
    years: int = Field(ge=15, le=50)
    interest_rate: float = Field(default=7.1, gt=0, le=15)


class EMIRequest(BaseModel):
    principal: float = Field(gt=0)
    annual_interest_rate: float = Field(gt=0, le=30)
    tenure_years: float = Field(gt=0, le=30)


class InflationRequest(BaseModel):
    amount: float = Field(gt=0)
    years: int = Field(gt=0, le=50)
    inflation_rate: float = Field(default=6.0, gt=0, le=20)


# ── Calculator Response ────────────────────────────────────────────────────────

class CalculatorResponse(BaseModel):
    result: str


# ── Documents ─────────────────────────────────────────────────────────────────

class DocumentUploadResponse(BaseModel):
    message: str
    chunks_indexed: int
    namespaces: List[str]
