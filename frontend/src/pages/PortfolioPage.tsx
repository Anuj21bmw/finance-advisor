import { useState } from 'react'
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  RefreshCw, AlertTriangle, CheckCircle2, Info,
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import type { Holding } from '@/types'

// ── Mock Portfolio Data ───────────────────────────────────────────────────────

const HOLDINGS: Holding[] = [
  { fund_name: 'Parag Parikh Flexi Cap - Direct', category: 'Flexi Cap', units: 842.34, nav: 76.18, invested: 500000, current_value: 641500, gain_loss: 141500, gain_loss_pct: 28.3, xirr: 22.1 },
  { fund_name: 'SBI Small Cap - Direct', category: 'Small Cap', units: 280.12, nav: 142.87, invested: 300000, current_value: 400050, gain_loss: 100050, gain_loss_pct: 33.4, xirr: 28.7 },
  { fund_name: 'Mirae Asset Large Cap - Direct', category: 'Large Cap', units: 2041.8, nav: 98.42, invested: 200000, current_value: 200946, gain_loss: 946, gain_loss_pct: 0.5, xirr: 16.2 },
  { fund_name: 'Axis Bluechip - Direct', category: 'Large Cap', units: 1840.5, nav: 54.33, invested: 100000, current_value: 99997, gain_loss: -3, gain_loss_pct: 0.0, xirr: 14.8 },
  { fund_name: 'Kotak Emerging Equity - Direct', category: 'Mid Cap', units: 560.7, nav: 89.64, invested: 50000, current_value: 50263, gain_loss: 263, gain_loss_pct: 0.5, xirr: 18.4 },
  { fund_name: 'HDFC Top 100 - Direct', category: 'Large Cap', units: 49.67, nav: 1008.72, invested: 50000, current_value: 50103, gain_loss: 103, gain_loss_pct: 0.2, xirr: 15.1 },
  { fund_name: 'PPF Account', category: 'PPF', units: 1, nav: 185000, invested: 150000, current_value: 185000, gain_loss: 35000, gain_loss_pct: 23.3, xirr: 7.1 },
  { fund_name: 'Nippon Index Sensex - Direct', category: 'Index Fund', units: 2227.3, nav: 26.94, invested: 60000, current_value: 59979, gain_loss: -21, gain_loss_pct: 0.0, xirr: 14.2 },
]

const TOTAL_INVESTED = HOLDINGS.reduce((s, h) => s + h.invested, 0)
const TOTAL_CURRENT = HOLDINGS.reduce((s, h) => s + h.current_value, 0)
const TOTAL_GAIN = TOTAL_CURRENT - TOTAL_INVESTED
const TOTAL_GAIN_PCT = (TOTAL_GAIN / TOTAL_INVESTED) * 100

// ── Historical Performance (12 months mock data) ──────────────────────────────

const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']
const PERFORMANCE_DATA = MONTHS.map((month, i) => {
  const base = 960000
  const growth = Math.pow(1 + 0.162 / 12, i + 1)
  const niftyBase = 21000
  const niftyGrowth = Math.pow(1 + 0.148 / 12, i + 1)
  return {
    month,
    portfolio: Math.round(base * growth),
    nifty50: Math.round(niftyBase * niftyGrowth),
  }
})

// ── Allocation for Pie Chart ───────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Flexi Cap': '#22c55e',
  'Small Cap': '#ef4444',
  'Large Cap': '#3b82f6',
  'Mid Cap': '#8b5cf6',
  'PPF': '#f59e0b',
  'Index Fund': '#06b6d4',
}

const allocationData = Object.entries(
  HOLDINGS.reduce((acc, h) => {
    acc[h.category] = (acc[h.category] || 0) + h.current_value
    return acc
  }, {} as Record<string, number>)
).map(([name, value]) => ({ name, value: Math.round((value / TOTAL_CURRENT) * 100), color: CATEGORY_COLORS[name] ?? '#94a3b8' }))

// ── Rebalancing Suggestions ───────────────────────────────────────────────────

const REBALANCING = [
  { type: 'warning', message: 'Small Cap allocation at 31% — slightly above recommended 25% for moderate risk profile. Consider pausing SIP by ₹3,000/month.' },
  { type: 'success', message: 'Large Cap exposure well-balanced at 30% across 3 different fund houses. No action needed.' },
  { type: 'info', message: 'PPF contribution is on track (₹1.5L annually). Consider adding ₹50K NPS contribution for additional ₹15,450 tax benefit under 80CCD(1B).' },
  { type: 'warning', message: 'No international equity in portfolio. Consider adding 5-10% via Parag Parikh or a dedicated international fund for geographic diversification.' },
]

// ── Components ────────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, positive }: { label: string; value: string; sub: string; positive?: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      <p className={clsx('text-xs mt-1 flex items-center gap-1', positive === true ? 'text-primary' : positive === false ? 'text-danger' : 'text-slate-400')}>
        {positive === true && <ArrowUpRight size={12} />}
        {positive === false && <ArrowDownRight size={12} />}
        {sub}
      </p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [sortKey, setSortKey] = useState<keyof Holding>('current_value')
  const [sortAsc, setSortAsc] = useState(false)

  const sortedHoldings = [...HOLDINGS].sort((a, b) => {
    const av = a[sortKey] as number
    const bv = b[sortKey] as number
    return sortAsc ? av - bv : bv - av
  })

  const handleSort = (key: keyof Holding) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ col }: { col: keyof Holding }) =>
    sortKey === col
      ? (sortAsc ? <TrendingUp size={10} className="inline ml-0.5" /> : <TrendingDown size={10} className="inline ml-0.5" />)
      : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Portfolio Overview</h2>
          <p className="text-slate-400 text-xs mt-0.5">As of April 2026 · 8 holdings</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-border hover:border-slate-500 rounded-lg px-3 py-1.5 transition-colors">
          <RefreshCw size={12} /> Refresh NAV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Current Value" value={`₹${(TOTAL_CURRENT / 100000).toFixed(1)}L`} sub="Across 8 holdings" />
        <SummaryCard
          label="Total Gain / Loss"
          value={`₹${(TOTAL_GAIN / 100000).toFixed(1)}L`}
          sub={`${TOTAL_GAIN >= 0 ? '+' : ''}${TOTAL_GAIN_PCT.toFixed(1)}% absolute`}
          positive={TOTAL_GAIN >= 0}
        />
        <SummaryCard
          label="Portfolio XIRR"
          value="16.2%"
          sub="+1.4% vs Nifty 50"
          positive={true}
        />
        <SummaryCard
          label="Monthly SIP"
          value="₹21,000"
          sub="Active across 5 funds"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historical Performance */}
        <div className="xl:col-span-2 bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">12-Month Performance</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-1 bg-primary rounded inline-block" /> Portfolio
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-1 bg-blue-400 rounded inline-block" /> Nifty 50
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={PERFORMANCE_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="portGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="niftyBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
                formatter={(v: number, name: string) =>
                  name === 'nifty50' ? [v.toLocaleString('en-IN'), 'Nifty 50'] : [`₹${v.toLocaleString('en-IN')}`, 'Portfolio']}
              />
              <Area type="monotone" dataKey="portfolio" stroke="#22c55e" strokeWidth={2} fill="url(#portGreen)" name="Portfolio" />
              <Area type="monotone" dataKey="nifty50" stroke="#3b82f6" strokeWidth={1.5} fill="url(#niftyBlue)" name="Nifty 50" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Allocation */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Asset Allocation</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={allocationData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                {allocationData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3">
            {allocationData.map((item) => (
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

      {/* Holdings Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-white font-semibold">Holdings</h3>
          <p className="text-slate-400 text-xs mt-0.5">Click column headers to sort</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background/50">
              <tr>
                {[
                  { key: 'fund_name', label: 'Fund' },
                  { key: 'category', label: 'Category' },
                  { key: 'units', label: 'Units' },
                  { key: 'nav', label: 'NAV' },
                  { key: 'invested', label: 'Invested' },
                  { key: 'current_value', label: 'Current Value' },
                  { key: 'gain_loss', label: 'Gain / Loss' },
                  { key: 'gain_loss_pct', label: 'Return %' },
                  { key: 'xirr', label: 'XIRR' },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key as keyof Holding)}
                    className="text-left text-slate-400 font-medium text-xs px-4 py-3 whitespace-nowrap cursor-pointer hover:text-white transition-colors"
                  >
                    {col.label} <SortIcon col={col.key as keyof Holding} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedHoldings.map((holding, i) => (
                <motion.tr
                  key={holding.fund_name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-t border-border hover:bg-surface-2 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-white font-medium text-xs">{holding.fund_name.split(' - ')[0]}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ color: CATEGORY_COLORS[holding.category] ?? '#94a3b8', background: (CATEGORY_COLORS[holding.category] ?? '#94a3b8') + '20' }}>
                      {holding.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">{holding.units.toFixed(2)}</td>
                  <td className="px-4 py-3 text-white font-mono text-xs">₹{holding.nav.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">₹{holding.invested.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-white font-medium text-xs">₹{holding.current_value.toLocaleString('en-IN')}</td>
                  <td className={clsx('px-4 py-3 font-medium text-xs', holding.gain_loss >= 0 ? 'text-primary' : 'text-danger')}>
                    {holding.gain_loss >= 0 ? '+' : ''}₹{holding.gain_loss.toLocaleString('en-IN')}
                  </td>
                  <td className={clsx('px-4 py-3 font-medium text-xs', holding.gain_loss_pct >= 0 ? 'text-primary' : 'text-danger')}>
                    {holding.gain_loss_pct >= 0 ? '+' : ''}{holding.gain_loss_pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-primary font-medium text-xs">{holding.xirr.toFixed(1)}%</td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot className="bg-background/50 border-t-2 border-border">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-slate-400 text-xs font-medium">Total</td>
                <td className="px-4 py-3 text-white text-xs font-bold">₹{TOTAL_INVESTED.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-white text-xs font-bold">₹{TOTAL_CURRENT.toLocaleString('en-IN')}</td>
                <td className={clsx('px-4 py-3 text-xs font-bold', TOTAL_GAIN >= 0 ? 'text-primary' : 'text-danger')}>
                  {TOTAL_GAIN >= 0 ? '+' : ''}₹{TOTAL_GAIN.toLocaleString('en-IN')}
                </td>
                <td className={clsx('px-4 py-3 text-xs font-bold', TOTAL_GAIN_PCT >= 0 ? 'text-primary' : 'text-danger')}>
                  {TOTAL_GAIN_PCT >= 0 ? '+' : ''}{TOTAL_GAIN_PCT.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-primary text-xs font-bold">16.2%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Rebalancing Suggestions */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw size={16} className="text-primary" />
          <h3 className="text-white font-semibold">AI Rebalancing Suggestions</h3>
        </div>
        <div className="space-y-3">
          {REBALANCING.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={clsx(
                'flex items-start gap-3 p-3 rounded-lg border',
                item.type === 'warning' && 'bg-amber-400/5 border-amber-400/20',
                item.type === 'success' && 'bg-primary/5 border-primary/20',
                item.type === 'info' && 'bg-blue-400/5 border-blue-400/20'
              )}
            >
              {item.type === 'warning' && <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />}
              {item.type === 'success' && <CheckCircle2 size={14} className="text-primary flex-shrink-0 mt-0.5" />}
              {item.type === 'info' && <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />}
              <p className="text-slate-300 text-sm">{item.message}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
