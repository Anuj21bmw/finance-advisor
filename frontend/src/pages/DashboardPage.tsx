import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, IndianRupee, Target, Shield,
  Zap, ArrowUpRight, ArrowDownRight, ChevronRight, Bot,
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { marketApi } from '@/api/client'
import { useStore } from '@/store/useStore'
import { Link } from 'react-router-dom'

// ── Metric Card ────────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string
  value: string
  change: string
  changePositive: boolean
  icon: React.ReactNode
  color: string
}

function MetricCard({ title, value, change, changePositive, icon, color }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-xl p-5 hover:border-slate-600 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
          {icon}
        </div>
        <span
          className={clsx(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            changePositive
              ? 'text-primary bg-primary/10'
              : 'text-danger bg-danger/10'
          )}
        >
          {changePositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </span>
      </div>
      <p className="text-slate-400 text-xs mb-1">{title}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </motion.div>
  )
}

// ── SIP Projection Data ────────────────────────────────────────────────────────

function generateSIPProjection(monthly: number, years: number[]): Record<string, number> {
  const rates = [0.12, 0.15, 0.18]
  const result: Record<string, number> = {}
  for (const yr of years) {
    const r = 0.12 / 12
    const n = yr * 12
    result[`${yr}Y`] = Math.round(monthly * (((1 + r) ** n - 1) / r) * (1 + r))
  }
  return result
}

const SIP_YEARS = [5, 10, 15, 20, 25]
const SIP_CHART_DATA = SIP_YEARS.map((yr) => {
  const r12 = 0.12 / 12
  const r15 = 0.15 / 12
  const n = yr * 12
  const invested = 21000 * n
  return {
    year: `${yr}Y`,
    invested: Math.round(invested / 100000),
    at12pct: Math.round((21000 * (((1 + r12) ** n - 1) / r12) * (1 + r12)) / 100000),
    at15pct: Math.round((21000 * (((1 + r15) ** n - 1) / r15) * (1 + r15)) / 100000),
  }
})

const ALLOCATION_DATA = [
  { name: 'Large Cap Equity', value: 35, color: '#22c55e' },
  { name: 'Mid Cap Equity', value: 20, color: '#3b82f6' },
  { name: 'Small Cap', value: 15, color: '#8b5cf6' },
  { name: 'Debt Funds', value: 15, color: '#f59e0b' },
  { name: 'PPF / EPF', value: 10, color: '#06b6d4' },
  { name: 'Gold ETF', value: 5, color: '#f97316' },
]

const RECENT_INSIGHTS = [
  {
    id: 1,
    query: 'Should I increase SIP in small cap funds given current market conditions?',
    summary:
      'Based on your moderate risk profile and 10-year horizon, increasing small cap allocation by 5% is advisable. Current valuations are attractive with 3Y rolling returns above 28%.',
    date: '2 hours ago',
    agents: ['researcher', 'analyzer', 'planner'],
  },
  {
    id: 2,
    query: 'How can I optimize my 80C investments for this financial year?',
    summary:
      'You have ₹68,000 remaining 80C capacity. Recommend: ELSS fund (₹50K) + remaining via PPF top-up. Combined tax saving under old regime: ₹21,060 at 30% slab.',
    date: '1 day ago',
    agents: ['executor', 'planner'],
  },
  {
    id: 3,
    query: 'What is my portfolio XIRR and how does it compare to Nifty 50?',
    summary:
      'Your portfolio XIRR is 16.2% vs Nifty 50 CAGR of 14.8% over the same period. Alpha generation of ~1.4% — primarily driven by mid/small cap outperformance.',
    date: '3 days ago',
    agents: ['analyzer', 'executor', 'critic'],
  },
]

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: indicesData, isLoading: indicesLoading } = useQuery({
    queryKey: ['market-indices'],
    queryFn: marketApi.indices,
    refetchInterval: 10000,
  })

  const { data: fundsData } = useQuery({
    queryKey: ['top-funds-dashboard'],
    queryFn: marketApi.topFunds,
    staleTime: 60000,
  })

  const indices = indicesData?.indices ?? []
  const funds = (fundsData?.funds ?? []).slice(0, 5)

  const metrics: MetricCardProps[] = [
    {
      title: 'Portfolio Value',
      value: '₹12.4L',
      change: '+18.3% YTD',
      changePositive: true,
      icon: <IndianRupee size={18} className="text-primary" />,
      color: 'bg-primary/10',
    },
    {
      title: 'Monthly SIP',
      value: '₹21,000',
      change: '+₹5K from last year',
      changePositive: true,
      icon: <Target size={18} className="text-blue-400" />,
      color: 'bg-blue-500/10',
    },
    {
      title: 'Tax Saved (FY)',
      value: '₹42,120',
      change: '80C fully utilized',
      changePositive: true,
      icon: <Shield size={18} className="text-purple-400" />,
      color: 'bg-purple-500/10',
    },
    {
      title: 'Portfolio XIRR',
      value: '16.2%',
      change: '+1.4% vs Nifty',
      changePositive: true,
      icon: <Zap size={18} className="text-amber-400" />,
      color: 'bg-amber-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div key={m.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <MetricCard {...m} />
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* SIP Growth Chart */}
        <div className="xl:col-span-2 bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">SIP Growth Projection</h3>
              <p className="text-slate-400 text-xs mt-0.5">₹21,000/month — Projected corpus (₹ Lakhs)</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-1 bg-primary rounded inline-block" /> 12% p.a.
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-1 bg-blue-400 rounded inline-block" /> 15% p.a.
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-1 bg-slate-500 rounded inline-block" style={{ borderStyle: 'dashed' }} /> Invested
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={SIP_CHART_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="green" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                formatter={(value: number) => [`₹${value}L`, '']}
              />
              <Area type="monotone" dataKey="at15pct" stroke="#3b82f6" strokeWidth={2} fill="url(#blue)" name="15% p.a." />
              <Area type="monotone" dataKey="at12pct" stroke="#22c55e" strokeWidth={2} fill="url(#green)" name="12% p.a." />
              <Area type="monotone" dataKey="invested" stroke="#475569" strokeWidth={1.5} strokeDasharray="4 2" fill="none" name="Invested" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Allocation Donut */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Asset Allocation</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={ALLOCATION_DATA}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {ALLOCATION_DATA.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                formatter={(v: number) => [`${v}%`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {ALLOCATION_DATA.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-400 text-xs">{item.name}</span>
                </div>
                <span className="text-white text-xs font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market Indices + Funds */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Market Indices Widget */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Market Indices</h3>
            <Link to="/markets" className="text-primary text-xs flex items-center gap-1 hover:underline">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          {indicesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-surface-2 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {indices.slice(0, 5).map((idx) => (
                <div key={idx.symbol} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{idx.symbol}</p>
                    <p className="text-slate-500 text-xs">{idx.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-mono font-medium">
                      {idx.category === 'forex'
                        ? `₹${idx.current.toFixed(2)}`
                        : idx.category === 'commodity'
                        ? `₹${idx.current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                        : idx.current.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <p
                      className={clsx(
                        'text-xs flex items-center justify-end gap-0.5',
                        idx.change_pct >= 0 ? 'text-primary' : 'text-danger'
                      )}
                    >
                      {idx.change_pct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performing Funds */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Top Performing Funds</h3>
            <Link to="/markets" className="text-primary text-xs flex items-center gap-1 hover:underline">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-slate-400 font-medium text-xs pb-2">Fund</th>
                  <th className="text-right text-slate-400 font-medium text-xs pb-2">1Y</th>
                  <th className="text-right text-slate-400 font-medium text-xs pb-2">3Y</th>
                  <th className="text-right text-slate-400 font-medium text-xs pb-2">5Y</th>
                </tr>
              </thead>
              <tbody>
                {funds.map((fund) => (
                  <tr key={fund.name} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    <td className="py-2.5 pr-4">
                      <p className="text-white font-medium text-xs line-clamp-1">{fund.name.split(' - ')[0]}</p>
                      <p className="text-slate-500 text-xs">{fund.category}</p>
                    </td>
                    <td className="text-right text-primary font-medium text-xs py-2.5">
                      {fund.returns_1y.toFixed(1)}%
                    </td>
                    <td className="text-right text-primary font-medium text-xs py-2.5">
                      {fund.returns_3y.toFixed(1)}%
                    </td>
                    <td className="text-right text-primary font-medium text-xs py-2.5">
                      {fund.returns_5y.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent AI Insights */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-primary" />
            <h3 className="text-white font-semibold">Recent AI Insights</h3>
          </div>
          <Link to="/advisor" className="text-primary text-xs flex items-center gap-1 hover:underline">
            Ask AI Advisor <ChevronRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {RECENT_INSIGHTS.map((insight, i) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-background border border-border rounded-lg p-4 hover:border-slate-600 transition-colors cursor-pointer"
            >
              <p className="text-slate-300 text-xs font-medium mb-2 line-clamp-2">"{insight.query}"</p>
              <p className="text-slate-400 text-xs line-clamp-3 mb-3">{insight.summary}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {insight.agents.map((agent) => (
                    <span
                      key={agent}
                      className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded capitalize"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
                <span className="text-slate-500 text-xs">{insight.date}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
