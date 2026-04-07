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
  TopFundsResponse,
  NewsResponse,
  DocumentUploadResponse,
} from '@/types'

// ── Axios Instance ─────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minutes for AI queries
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

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
  indices: async (): Promise<MarketIndicesResponse> => {
    const { data } = await api.get<MarketIndicesResponse>('/market/indices')
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
