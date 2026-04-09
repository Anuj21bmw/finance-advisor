// ── Auth ───────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number
  full_name: string
  email: string
  created_at?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

export interface RegisterPayload {
  full_name: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

// ── User Profile ───────────────────────────────────────────────────────────────

export interface UserProfile {
  age: number
  income: number
  risk_appetite: 'low' | 'moderate' | 'high'
  goals: string[]
  horizon: number
  investments_80c: number
}

// ── Advisor ────────────────────────────────────────────────────────────────────

export interface AdvisorRequest {
  query: string
  user_profile?: UserProfile
  uploaded_pdfs?: string[]
}

export interface AgentMessage {
  agent: string
  content: string
  tool_calls?: Record<string, unknown>[]
  metadata?: Record<string, unknown>
}

export interface AdvisorResponse {
  summary?: string
  final_advice?: string
  research_output?: string
  analysis_output?: string
  execution_output?: string
  plan_output?: string
  disclaimer?: string
  tool_results?: Record<string, unknown>[]
  messages?: AgentMessage[]
}

// ── WebSocket Streaming ────────────────────────────────────────────────────────

export interface StreamEvent {
  agent: string
  output?: string
  state?: AdvisorResponse
  done: boolean
  error?: string
}

// ── Calculators ────────────────────────────────────────────────────────────────

export interface SIPRequest {
  monthly_investment: number
  annual_return_rate: number
  years: number
}

export interface LumpsumRequest {
  principal: number
  annual_return_rate: number
  years: number
}

export interface XIRRRequest {
  cash_flows: number[]
  dates_str: string[]
}

export interface TaxRequest {
  annual_income: number
  investments_80c: number
  nps_contribution: number
  health_insurance: number
  hra_exemption: number
  regime: 'old' | 'new'
}

export interface PPFRequest {
  annual_investment: number
  years: number
  interest_rate: number
}

export interface EMIRequest {
  principal: number
  annual_interest_rate: number
  tenure_years: number
}

export interface InflationRequest {
  amount: number
  years: number
  inflation_rate: number
}

export interface CalculatorResponse {
  result: string
}

// ── Market Data ────────────────────────────────────────────────────────────────

export interface MarketIndex {
  symbol: string
  name: string
  current: number
  change: number
  change_pct: number
  prev_close: number
  category: string
  unit: string
  sparkline: number[]
  timestamp: string
}

export interface MarketIndicesResponse {
  indices: MarketIndex[]
  market_status: string
  is_open: boolean
  as_of: string
}

export interface MarketStatus {
  is_open: boolean
  status: 'OPEN' | 'CLOSED'
  next_event: string
  seconds_to_event: number
  current_time_ist: string
  date_ist: string
}

export interface StockItem {
  symbol: string
  yf_symbol: string
  name: string
  current: number
  prev_close: number
  change: number
  change_pct: number
  sparkline: number[]
  timestamp: string
}

export interface TopStocksResponse {
  all: StockItem[]
  gainers: StockItem[]
  losers: StockItem[]
  as_of: string
}

export interface MutualFund {
  name: string
  category: string
  amc: string
  nav: number
  returns_1y: number
  returns_3y: number
  returns_5y: number
  rating: number
  aum_cr: number
  expense_ratio: number
  risk: string
}

export interface TopFundsResponse {
  funds: MutualFund[]
  as_of: string
}

export interface NewsItem {
  id: number
  headline: string
  summary: string
  source: string
  category: string
  timestamp: string
  url: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

export interface NewsResponse {
  news: NewsItem[]
  as_of: string
}

// ── Documents ──────────────────────────────────────────────────────────────────

export interface DocumentUploadResponse {
  message: string
  chunks_indexed: number
  namespaces: string[]
}

export interface UploadedFile {
  name: string
  path: string
  size: number
  status: 'uploaded' | 'processing' | 'indexed' | 'error'
  chunks?: number
}

// ── Chat / Advisor Page ────────────────────────────────────────────────────────

export type AgentStatus = 'waiting' | 'running' | 'done' | 'error'

export interface AgentState {
  name: string
  label: string
  status: AgentStatus
  output?: string
  color: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  agentStates?: AgentState[]
  isStreaming?: boolean
}

// ── Portfolio ──────────────────────────────────────────────────────────────────

export interface Holding {
  fund_name: string
  category: string
  units: number
  nav: number
  invested: number
  current_value: number
  gain_loss: number
  gain_loss_pct: number
  xirr: number
}

export interface PortfolioSummary {
  total_invested: number
  current_value: number
  total_gain: number
  gain_pct: number
  xirr: number
  sip_monthly: number
}
