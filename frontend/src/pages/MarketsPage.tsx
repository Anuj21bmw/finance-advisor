import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Star, Clock, ExternalLink,
  RefreshCw, Newspaper, Activity,
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { marketApi } from '@/api/client'
import type { MarketIndex, MutualFund, NewsItem, StockItem } from '@/types'

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds)
  useEffect(() => {
    setRemaining(seconds)
    const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [seconds])

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  return h > 0
    ? `${h}h ${m}m ${s}s`
    : m > 0
    ? `${m}m ${s}s`
    : `${s}s`
}

// ── Market Status Badge ───────────────────────────────────────────────────────

function MarketStatusBadge() {
  const { data: status } = useQuery({
    queryKey: ['market-status'],
    queryFn: marketApi.status,
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const countdown = useCountdown(status?.seconds_to_event ?? 0)

  if (!status) return null

  return (
    <div className="flex items-center gap-3">
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold',
          status.is_open
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-slate-700/50 border-slate-600 text-slate-400'
        )}
      >
        <span
          className={clsx(
            'w-2 h-2 rounded-full',
            status.is_open ? 'bg-green-400 animate-pulse' : 'bg-slate-500'
          )}
        />
        NSE {status.status}
      </div>
      <span className="text-slate-500 text-xs">
        {status.next_event} in{' '}
        <span className={clsx('font-mono font-semibold', status.is_open ? 'text-green-400' : 'text-slate-300')}>
          {countdown}
        </span>
      </span>
      <span className="text-slate-600 text-xs hidden sm:block">{status.current_time_ist}</span>
    </div>
  )
}

// ── Index Card ────────────────────────────────────────────────────────────────

function IndexCard({ index, i }: { index: MarketIndex; i: number }) {
  const isPositive = index.change_pct >= 0
  const sparkData = index.sparkline.map((v, j) => ({ v, j }))

  const formatValue = (idx: MarketIndex) => {
    if (idx.category === 'forex') return idx.current.toFixed(2)
    if (idx.category === 'commodity')
      return `$${idx.current.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    return idx.current.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className="bg-surface border border-border rounded-xl p-4 hover:border-slate-600 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-semibold text-sm">{index.symbol}</p>
          <p className="text-slate-500 text-xs">{index.name}</p>
        </div>
        <span
          className={clsx(
            'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
            isPositive ? 'text-primary bg-primary/10' : 'text-danger bg-danger/10'
          )}
        >
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {isPositive ? '+' : ''}{index.change_pct.toFixed(2)}%
        </span>
      </div>

      <p className="text-white text-xl font-bold font-mono mb-1">{formatValue(index)}</p>
      <p className={clsx('text-xs mb-3', isPositive ? 'text-primary' : 'text-danger')}>
        {isPositive ? '+' : ''}{index.change.toFixed(2)} pts
      </p>

      {/* Sparkline */}
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={sparkData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={isPositive ? '#22c55e' : '#ef4444'}
            strokeWidth={1.5}
            dot={false}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }}
            formatter={(v: number) => [formatValue({ ...index, current: v }), '']}
            labelFormatter={() => ''}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// ── Stock Row ────────────────────────────────────────────────────────────────

function StockRow({ stock, i }: { stock: StockItem; i: number }) {
  const isPositive = stock.change_pct >= 0
  return (
    <motion.div
      initial={{ opacity: 0, x: isPositive ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04 }}
      className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">{stock.symbol.slice(0, 2)}</span>
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold truncate">{stock.symbol}</p>
          <p className="text-slate-500 text-xs">NSE</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-white text-sm font-mono font-medium">
          ₹{stock.current.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </p>
        <p className={clsx('text-xs font-medium flex items-center justify-end gap-0.5', isPositive ? 'text-primary' : 'text-danger')}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {isPositive ? '+' : ''}{stock.change_pct.toFixed(2)}%
        </p>
      </div>
    </motion.div>
  )
}

// ── Star Rating ───────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={10}
          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
        />
      ))}
    </div>
  )
}

// ── Risk Badge ────────────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    'Very High': 'text-red-400 bg-red-400/10',
    'High': 'text-orange-400 bg-orange-400/10',
    'Moderately High': 'text-amber-400 bg-amber-400/10',
    'Moderate': 'text-blue-400 bg-blue-400/10',
    'Low': 'text-primary bg-primary/10',
  }
  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', colors[risk] ?? 'text-slate-400 bg-slate-400/10')}>
      {risk}
    </span>
  )
}

// ── News Card ─────────────────────────────────────────────────────────────────

function NewsCard({ item, i }: { item: NewsItem; i: number }) {
  const sentimentColor = {
    positive: 'border-l-primary',
    negative: 'border-l-danger',
    neutral: 'border-l-slate-500',
  }[item.sentiment]

  const timeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return `${Math.floor(diff / 60000)}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.08 }}
      className={clsx(
        'bg-surface border border-border border-l-4 rounded-xl p-4 hover:border-slate-600 transition-all cursor-pointer',
        sentimentColor
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-white font-medium text-sm leading-snug">{item.headline}</h4>
        <ExternalLink size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
      </div>
      <p className="text-slate-400 text-xs line-clamp-2 mb-3">{item.summary}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">{item.source}</span>
          <span
            className={clsx(
              'text-xs px-1.5 py-0.5 rounded',
              item.sentiment === 'positive' && 'text-primary bg-primary/10',
              item.sentiment === 'negative' && 'text-danger bg-danger/10',
              item.sentiment === 'neutral' && 'text-slate-400 bg-slate-400/10'
            )}
          >
            {item.category}
          </span>
        </div>
        <span className="text-slate-500 text-xs flex items-center gap-1">
          <Clock size={10} /> {timeAgo(item.timestamp)}
        </span>
      </div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const {
    data: indicesData,
    isLoading: indicesLoading,
    refetch: refetchIndices,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['market-indices-page'],
    queryFn: marketApi.indices,
    refetchInterval: 30000,
    staleTime: 25000,
  })

  const { data: stocksData, isLoading: stocksLoading } = useQuery({
    queryKey: ['market-stocks'],
    queryFn: marketApi.stocks,
    refetchInterval: 30000,
    staleTime: 25000,
  })

  const { data: fundsData, isLoading: fundsLoading } = useQuery({
    queryKey: ['top-funds-page'],
    queryFn: marketApi.topFunds,
    refetchInterval: 300000,
    staleTime: 280000,
  })

  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ['market-news'],
    queryFn: marketApi.news,
    refetchInterval: 60000,
  })

  const isOpen = indicesData?.is_open ?? false

  const indices = indicesData?.indices ?? []
  const gainers = stocksData?.gainers ?? []
  const losers  = stocksData?.losers ?? []
  const funds   = fundsData?.funds ?? []
  const news    = newsData?.news ?? []

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-semibold text-lg">Indian Markets</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Live data via NSE/BSE · Refreshes every {isOpen ? '30s' : '5min'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MarketStatusBadge />
          <span className="text-slate-500 text-xs flex items-center gap-1">
            <Clock size={12} /> {lastUpdated}
          </span>
          <button
            onClick={() => refetchIndices()}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-border hover:border-slate-500 rounded-lg px-3 py-1.5 transition-colors"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Market Indices Grid */}
      <section>
        <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Market Indices</h3>
        {indicesLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-4 h-36 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {indices.map((idx, i) => (
              <IndexCard key={idx.symbol} index={idx} i={i} />
            ))}
          </div>
        )}
      </section>

      {/* Gainers & Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className="bg-surface border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <h3 className="text-white font-semibold">Top Gainers</h3>
            <span className="text-xs text-slate-500 ml-auto">NSE · Today</span>
          </div>
          <div className="px-5 py-2">
            {stocksLoading ? (
              <div className="space-y-3 py-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-background rounded animate-pulse" />
                ))}
              </div>
            ) : gainers.length > 0 ? (
              gainers.slice(0, 8).map((s, i) => <StockRow key={s.symbol} stock={s} i={i} />)
            ) : (
              <p className="text-slate-500 text-sm py-6 text-center flex items-center justify-center gap-2">
                <Activity size={16} /> Data loading...
              </p>
            )}
          </div>
        </div>

        {/* Top Losers */}
        <div className="bg-surface border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <TrendingDown size={16} className="text-danger" />
            <h3 className="text-white font-semibold">Top Losers</h3>
            <span className="text-xs text-slate-500 ml-auto">NSE · Today</span>
          </div>
          <div className="px-5 py-2">
            {stocksLoading ? (
              <div className="space-y-3 py-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-background rounded animate-pulse" />
                ))}
              </div>
            ) : losers.length > 0 ? (
              losers.slice(0, 8).map((s, i) => <StockRow key={s.symbol} stock={s} i={i} />)
            ) : (
              <p className="text-slate-500 text-sm py-6 text-center flex items-center justify-center gap-2">
                <Activity size={16} /> Data loading...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Funds + News */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top Mutual Funds Table */}
        <div className="xl:col-span-2 bg-surface border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-white font-semibold">Top Mutual Funds</h3>
            <p className="text-slate-400 text-xs mt-0.5">Direct Growth plans — NAV from AMFI India</p>
          </div>
          <div className="overflow-x-auto">
            {fundsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 bg-background rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-background/50">
                  <tr>
                    {['Fund Name', 'Category', 'NAV', '1Y %', '3Y %', '5Y %', 'Risk', 'Rating'].map((h) => (
                      <th key={h} className="text-left text-slate-400 font-medium text-xs px-4 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {funds.map((fund: MutualFund, i: number) => (
                    <motion.tr
                      key={fund.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-t border-border hover:bg-surface-2 transition-colors"
                    >
                      <td className="px-4 py-3 min-w-[200px]">
                        <p className="text-white font-medium text-xs">{fund.name.split(' - ')[0]}</p>
                        <p className="text-slate-500 text-xs">{fund.amc}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {fund.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-mono text-sm font-medium">
                        ₹{fund.nav.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {fund.returns_1y != null
                          ? <span className="text-primary font-medium text-sm">{fund.returns_1y.toFixed(1)}%</span>
                          : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {fund.returns_3y != null
                          ? <span className="text-primary font-medium text-sm">{fund.returns_3y.toFixed(1)}%</span>
                          : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {fund.returns_5y != null
                          ? <span className="text-primary font-medium text-sm">{fund.returns_5y.toFixed(1)}%</span>
                          : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge risk={fund.risk} />
                      </td>
                      <td className="px-4 py-3">
                        <StarRating rating={fund.rating} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Market News */}
        <div className="bg-surface border border-border rounded-xl flex flex-col">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2 flex-shrink-0">
            <Newspaper size={16} className="text-primary" />
            <h3 className="text-white font-semibold">Market News</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {newsLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-background rounded animate-pulse" />
              ))
            ) : (
              news.map((item: NewsItem, i: number) => (
                <NewsCard key={item.id} item={item} i={i} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
