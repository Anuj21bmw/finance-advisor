import axios from 'axios'
import type {
  AdvisorRequest,
  AdvisorResponse,
  SIPRequest,
  LumpsumRequest,
  TaxRequest,
  PPFRequest,
  EMIRequest,
  InflationRequest,
  XIRRRequest,
  CalculatorResponse,
  MarketIndicesResponse,
  MarketStatus,
  TopFundsResponse,
  TopStocksResponse,
  NewsResponse,
  DocumentUploadResponse,
  LoginPayload,
  RegisterPayload,
  TokenResponse,
  AuthUser,
} from '@/types'

// ── Axios Instance ─────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fa_token')
      localStorage.removeItem('fa_user')
      window.location.href = '/login'
    }
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  register: async (payload: RegisterPayload): Promise<TokenResponse> => {
    const { data } = await api.post<TokenResponse>('/auth/register', payload)
    return data
  },
  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const { data } = await api.post<TokenResponse>('/auth/login', payload)
    return data
  },
  me: async (): Promise<AuthUser> => {
    const { data } = await api.get<AuthUser>('/auth/me')
    return data
  },
  logout: () => {
    localStorage.removeItem('fa_token')
    localStorage.removeItem('fa_user')
  },
}

// ── Advisor API ────────────────────────────────────────────────────────────────

export const advisorApi = {
  query: async (request: AdvisorRequest): Promise<AdvisorResponse> => {
    const { data } = await api.post<AdvisorResponse>('/advisor/query', request)
    return data
  },
}

// ── Calculators API ────────────────────────────────────────────────────────────

export const calculatorApi = {
  sip: async (req: SIPRequest): Promise<CalculatorResponse> => {
    const { data } = await api.post<CalculatorResponse>('/calculators/sip', req)
    return data
  },
  lumpsum: async (req: LumpsumRequest): Promise<CalculatorResponse> => {
    const { data } = await api.post<CalculatorResponse>('/calculators/lumpsum', req)
    return data
  },
  tax: async (req: TaxRequest): Promise<CalculatorResponse> => {
    const { data } = await api.post<CalculatorResponse>('/calculators/tax', req)
    return data
  },
  ppf: async (req: PPFRequest): Promise<CalculatorResponse> => {
    const { data } = await api.post<CalculatorResponse>('/calculators/ppf', req)
    return data
  },
  emi: async (req: EMIRequest): Promise<CalculatorResponse> => {
    const { data } = await api.post<CalculatorResponse>('/calculators/emi', req)
    return data
  },
  inflation: async (req: InflationRequest): Promise<CalculatorResponse> => {
    const { data } = await api.post<CalculatorResponse>('/calculators/inflation', req)
    return data
  },
  xirr: async (req: XIRRRequest): Promise<CalculatorResponse> => {
    const { data } = await api.post<CalculatorResponse>('/calculators/xirr', req)
    return data
  },
}

// ── Market API ────────────────────────────────────────────────────────────────

export const marketApi = {
  status: async (): Promise<MarketStatus> => {
    const { data } = await api.get<MarketStatus>('/market/status')
    return data
  },
  indices: async (): Promise<MarketIndicesResponse> => {
    const { data } = await api.get<MarketIndicesResponse>('/market/indices')
    return data
  },
  stocks: async (): Promise<TopStocksResponse> => {
    const { data } = await api.get<TopStocksResponse>('/market/stocks')
    return data
  },
  topFunds: async (): Promise<TopFundsResponse> => {
    const { data } = await api.get<TopFundsResponse>('/market/top-funds')
    return data
  },
  news: async (): Promise<NewsResponse> => {
    const { data } = await api.get<NewsResponse>('/market/news')
    return data
  },
}

// ── Documents API ─────────────────────────────────────────────────────────────

export const documentsApi = {
  upload: async (file: File): Promise<{ message: string; path: string; filename: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  ingest: async (pdfPaths: string[]): Promise<DocumentUploadResponse> => {
    const { data } = await api.post<DocumentUploadResponse>('/documents/ingest', {
      pdf_paths: pdfPaths,
    })
    return data
  },
}

// ── WebSocket Helper ──────────────────────────────────────────────────────────

export function createAdvisorWebSocket(
  onMessage: (event: import('@/types').StreamEvent) => void,
  onError?: (error: Event) => void,
  onClose?: () => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // In dev, Vite runs on port 3000 but the WS proxy forwards /api to :8000
  // In prod, the host serves both frontend and backend on the same origin
  const host = window.location.host
  const ws = new WebSocket(`${protocol}//${host}/api/advisor/stream`)

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as import('@/types').StreamEvent
      onMessage(data)
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e)
    }
  }

  if (onError) ws.onerror = onError
  if (onClose) ws.onclose = onClose

  return ws
}

export default api
