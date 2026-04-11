import { useState, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Calculator, TrendingUp, Shield, Home, Landmark, DollarSign } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { calculatorApi } from '@/api/client'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

function Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-slate-400 text-xs">{label}</label>
        <span className="text-primary text-xs font-medium font-mono">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-surface-2 rounded-full appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-slate-600 text-xs">{format(min)}</span>
        <span className="text-slate-600 text-xs">{format(max)}</span>
      </div>
    </div>
  )
}

function ResultBox({ result }: { result: string | null }) {
  if (!result) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background border border-primary/30 rounded-xl p-4 mt-4"
    >
      <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Result</p>
      <pre className="text-slate-200 text-xs font-mono leading-relaxed whitespace-pre-wrap">{result}</pre>
    </motion.div>
  )
}

function NumberInput({
  label, value, onChange, prefix, min,
}: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; min?: number;
}) {
  return (
    <div>
      <label className="text-slate-400 text-xs mb-1 block">{label}</label>
      <div className="flex items-center bg-background border border-border rounded-lg overflow-hidden focus-within:border-primary transition-colors">
        {prefix && <span className="px-3 text-slate-400 text-sm border-r border-border">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min ?? 0}
          className="flex-1 bg-transparent px-3 py-2 text-white text-sm outline-none"
        />
      </div>
    </div>
  )
}

// ── SIP Tab ───────────────────────────────────────────────────────────────────

function SIPCalculator() {
  const [monthly, setMonthly] = useState(10000)
  const [rate, setRate] = useState(12)
  const [years, setYears] = useState(10)
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const yearOptions = [5, 10, 15, 20, 25]
  const r = rate / 100 / 12
  const chartData = yearOptions.map((yr) => {
    const n = yr * 12
    const fv = r > 0 ? monthly * (((1 + r) ** n - 1) / r) * (1 + r) : monthly * n
    return { year: `${yr}Y`, invested: Math.round(monthly * n), corpus: Math.round(fv) }
  })

  const calculate = async () => {
    setLoading(true)
    try {
      const res = await calculatorApi.sip({ monthly_investment: monthly, annual_return_rate: rate, years })
      setResult(res.result)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-5">
        <Slider
          label="Monthly Investment" value={monthly} min={500} max={100000} step={500}
          onChange={setMonthly} format={(v) => fmt(v)}
        />
        <Slider
          label="Expected Annual Return" value={rate} min={6} max={30} step={0.5}
          onChange={setRate} format={(v) => `${v}%`}
        />
        <Slider
          label="Investment Period" value={years} min={1} max={30} step={1}
          onChange={setYears} format={(v) => `${v} yrs`}
        />
        <button
          onClick={calculate}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-black font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Calculate SIP Returns'}
        </button>
        <ResultBox result={result} />
      </div>

      <div>
        <p className="text-slate-400 text-xs font-medium mb-3 uppercase tracking-wider">SIP Growth Projection</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="sipGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
            />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
              formatter={(v: number) => [fmt(v), '']}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            <Area type="monotone" dataKey="corpus" stroke="#22c55e" strokeWidth={2} fill="url(#sipGreen)" name="Maturity Value" />
            <Area type="monotone" dataKey="invested" stroke="#475569" strokeWidth={1.5} fill="none" strokeDasharray="4 2" name="Amount Invested" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Tax Saver Tab ─────────────────────────────────────────────────────────────

function TaxCalculator() {
  const [income, setIncome] = useState(1500000)
  const [inv80c, setInv80c] = useState(150000)
  const [nps, setNps] = useState(50000)
  const [health, setHealth] = useState(25000)
  const [hra, setHra] = useState(120000)
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Simplified tax computation for chart
  const computeTax = (taxableIncome: number, regime: 'old' | 'new') => {
    if (regime === 'old') {
      let tax = 0
      if (taxableIncome <= 250000) tax = 0
      else if (taxableIncome <= 500000) tax = (taxableIncome - 250000) * 0.05
      else if (taxableIncome <= 1000000) tax = 12500 + (taxableIncome - 500000) * 0.2
      else tax = 112500 + (taxableIncome - 1000000) * 0.3
      return Math.round(tax * 1.04) // + 4% cess
    } else {
      let tax = 0
      if (taxableIncome <= 300000) tax = 0
      else if (taxableIncome <= 700000) tax = (taxableIncome - 300000) * 0.05
      else if (taxableIncome <= 1000000) tax = 20000 + (taxableIncome - 700000) * 0.1
      else if (taxableIncome <= 1200000) tax = 50000 + (taxableIncome - 1000000) * 0.15
      else if (taxableIncome <= 1500000) tax = 80000 + (taxableIncome - 1200000) * 0.2
      else tax = 140000 + (taxableIncome - 1500000) * 0.3
      return Math.round(tax * 1.04)
    }
  }

  const deductions = Math.min(inv80c, 150000) + Math.min(nps, 50000) + Math.min(health, 25000) + hra
  const oldRegimeTaxable = Math.max(income - deductions - 50000, 0) // std deduction
  const newRegimeTaxable = Math.max(income - 75000, 0) // only std deduction in new

  const oldTax = computeTax(oldRegimeTaxable, 'old')
  const newTax = computeTax(newRegimeTaxable, 'new')

  const chartData = [
    { regime: 'Old Regime', tax: oldTax, saved: Math.max(newTax - oldTax, 0) },
    { regime: 'New Regime', tax: newTax, saved: Math.max(oldTax - newTax, 0) },
  ]

  const calculate = async () => {
    setLoading(true)
    try {
      const res = await calculatorApi.tax({
        annual_income: income,
        investments_80c: inv80c,
        nps_contribution: nps,
        health_insurance: health,
        hra_exemption: hra,
        regime: oldTax <= newTax ? 'old' : 'new',
      })
      setResult(res.result)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <NumberInput label="Annual Income (₹)" value={income} onChange={setIncome} prefix="₹" />
        <NumberInput label="80C Investments (₹)" value={inv80c} onChange={setInv80c} prefix="₹" />
        <NumberInput label="NPS Contribution (₹)" value={nps} onChange={setNps} prefix="₹" />
        <NumberInput label="Health Insurance Premium (₹)" value={health} onChange={setHealth} prefix="₹" />
        <NumberInput label="HRA Exemption (₹)" value={hra} onChange={setHra} prefix="₹" />

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-primary text-xs font-medium">Old Regime Tax</p>
            <p className="text-white text-lg font-bold mt-1">{fmt(oldTax)}</p>
          </div>
          <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-3">
            <p className="text-blue-400 text-xs font-medium">New Regime Tax</p>
            <p className="text-white text-lg font-bold mt-1">{fmt(newTax)}</p>
          </div>
        </div>

        <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
          <p className="text-amber-400 text-xs font-medium">
            Recommended: {oldTax <= newTax ? 'Old Regime' : 'New Regime'} (saves {fmt(Math.abs(oldTax - newTax))})
          </p>
        </div>

        <button
          onClick={calculate}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-black font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Get Detailed Tax Breakdown'}
        </button>
        <ResultBox result={result} />
      </div>

      <div>
        <p className="text-slate-400 text-xs font-medium mb-3 uppercase tracking-wider">Old vs New Regime Comparison</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="regime" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
              formatter={(v: number) => [fmt(v), '']}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            <Bar dataKey="tax" fill="#22c55e" name="Tax Payable" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── PPF Tab ───────────────────────────────────────────────────────────────────

function PPFCalculator() {
  const [annual, setAnnual] = useState(150000)
  const [years, setYears] = useState(15)
  const [rate, setRate] = useState(7.1)
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const chartData = Array.from({ length: years }, (_, i) => {
    const yr = i + 1
    let balance = 0
    for (let y = 1; y <= yr; y++) {
      balance = (balance + annual) * (1 + rate / 100)
    }
    return { year: `Y${yr}`, invested: annual * yr, balance: Math.round(balance) }
  })

  const calculate = async () => {
    setLoading(true)
    try {
      const res = await calculatorApi.ppf({ annual_investment: annual, years, interest_rate: rate })
      setResult(res.result)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-5">
        <Slider
          label="Annual PPF Investment" value={annual} min={500} max={150000} step={1000}
          onChange={setAnnual} format={fmt}
        />
        <Slider
          label="Investment Tenure" value={years} min={15} max={30} step={5}
          onChange={setYears} format={(v) => `${v} yrs`}
        />
        <Slider
          label="Interest Rate" value={rate} min={6} max={9} step={0.1}
          onChange={setRate} format={(v) => `${v}%`}
        />
        <button
          onClick={calculate}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-black font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Calculate PPF Maturity'}
        </button>
        <ResultBox result={result} />
      </div>

      <div>
        <p className="text-slate-400 text-xs font-medium mb-3 uppercase tracking-wider">PPF Balance Growth</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="ppfGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
              formatter={(v: number) => [fmt(v), '']}
            />
            <Area type="monotone" dataKey="balance" stroke="#22c55e" strokeWidth={2} fill="url(#ppfGreen)" name="PPF Balance" />
            <Area type="monotone" dataKey="invested" stroke="#475569" strokeWidth={1.5} fill="none" strokeDasharray="4 2" name="Amount Invested" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── EMI Tab ───────────────────────────────────────────────────────────────────

function EMICalculator() {
  const [principal, setPrincipal] = useState(5000000)
  const [rate, setRate] = useState(8.5)
  const [tenure, setTenure] = useState(20)
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const r = rate / 100 / 12
  const n = tenure * 12
  const emi = principal * r * (1 + r) ** n / ((1 + r) ** n - 1)
  const totalPayment = emi * n
  const totalInterest = totalPayment - principal

  const pieData = [
    { name: 'Principal', value: Math.round(principal), color: '#22c55e' },
    { name: 'Interest', value: Math.round(totalInterest), color: '#ef4444' },
  ]

  const calculate = async () => {
    setLoading(true)
    try {
      const res = await calculatorApi.emi({ principal, annual_interest_rate: rate, tenure_years: tenure })
      setResult(res.result)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-5">
        <Slider
          label="Loan Amount" value={principal} min={100000} max={10000000} step={100000}
          onChange={setPrincipal} format={fmt}
        />
        <Slider
          label="Annual Interest Rate" value={rate} min={6} max={18} step={0.25}
          onChange={setRate} format={(v) => `${v}%`}
        />
        <Slider
          label="Loan Tenure" value={tenure} min={1} max={30} step={1}
          onChange={setTenure} format={(v) => `${v} yrs`}
        />

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background border border-border rounded-lg p-3">
            <p className="text-slate-400 text-xs">Monthly EMI</p>
            <p className="text-white font-bold text-sm mt-1">{fmt(Math.round(emi))}</p>
          </div>
          <div className="bg-background border border-border rounded-lg p-3">
            <p className="text-slate-400 text-xs">Total Interest</p>
            <p className="text-danger font-bold text-sm mt-1">{fmt(Math.round(totalInterest))}</p>
          </div>
          <div className="bg-background border border-border rounded-lg p-3">
            <p className="text-slate-400 text-xs">Total Payment</p>
            <p className="text-white font-bold text-sm mt-1">{fmt(Math.round(totalPayment))}</p>
          </div>
        </div>

        <button
          onClick={calculate}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-black font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Get Full EMI Schedule'}
        </button>
        <ResultBox result={result} />
      </div>

      <div>
        <p className="text-slate-400 text-xs font-medium mb-3 uppercase tracking-wider">Principal vs Interest Breakup</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="value">
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
              formatter={(v: number) => [fmt(v), '']}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── XIRR Tab ──────────────────────────────────────────────────────────────────

interface CashFlowRow { date: string; amount: string }

function XIRRCalculator() {
  const [rows, setRows] = useState<CashFlowRow[]>([
    { date: '2022-01-01', amount: '-100000' },
    { date: '2022-07-01', amount: '-100000' },
    { date: '2023-01-01', amount: '-100000' },
    { date: '2024-01-01', amount: '380000' },
  ])
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const addRow = () => setRows((r) => [...r, { date: '', amount: '' }])
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: keyof CashFlowRow, value: string) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))
  }

  const calculate = async () => {
    const validRows = rows.filter((r) => r.date && r.amount)
    if (validRows.length < 2) {
      toast.error('Need at least 2 cash flow entries')
      return
    }
    setLoading(true)
    try {
      const res = await calculatorApi.xirr({
        cash_flows: validRows.map((r) => parseFloat(r.amount)),
        dates_str: validRows.map((r) => r.date),
      })
      setResult(res.result)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <p className="text-slate-400 text-sm">
        Enter cash flows (negative = investments, positive = redemptions/returns) with dates to calculate annualized XIRR.
      </p>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <span className="text-slate-400 text-xs font-medium px-1">Date (YYYY-MM-DD)</span>
          <span className="text-slate-400 text-xs font-medium px-1">Amount (₹ — negative for outflow)</span>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 items-center">
            <input
              type="text"
              value={row.date}
              onChange={(e) => updateRow(i, 'date', e.target.value)}
              placeholder="YYYY-MM-DD"
              className="bg-background border border-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary transition-colors"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={row.amount}
                onChange={(e) => updateRow(i, 'amount', e.target.value)}
                placeholder="-100000"
                className={clsx(
                  'flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors',
                  parseFloat(row.amount) < 0 ? 'text-danger' : 'text-primary'
                )}
              />
              <button
                onClick={() => removeRow(i)}
                className="px-2 text-slate-500 hover:text-danger transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={addRow}
          className="flex-1 border border-dashed border-border text-slate-400 hover:border-primary hover:text-primary rounded-xl py-2 text-sm transition-colors"
        >
          + Add Cash Flow
        </button>
        <button
          onClick={calculate}
          disabled={loading}
          className="flex-1 bg-primary hover:bg-primary-dark text-black font-semibold py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Calculate XIRR'}
        </button>
      </div>
      <ResultBox result={result} />
    </div>
  )
}

// ── Tabs Config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'sip', label: 'SIP Calculator', icon: <TrendingUp size={15} />, component: <SIPCalculator /> },
  { id: 'tax', label: 'Tax Saver (80C)', icon: <Shield size={15} />, component: <TaxCalculator /> },
  { id: 'ppf', label: 'PPF Calculator', icon: <Landmark size={15} />, component: <PPFCalculator /> },
  { id: 'emi', label: 'EMI Calculator', icon: <Home size={15} />, component: <EMICalculator /> },
  { id: 'xirr', label: 'XIRR', icon: <DollarSign size={15} />, component: <XIRRCalculator /> },
]

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState('sip')
  const active = TABS.find((t) => t.id === activeTab)!

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calculator size={22} className="text-primary" />
        <div>
          <h2 className="text-white font-semibold text-lg">Financial Calculators</h2>
          <p className="text-slate-400 text-xs">Powered by AI-grade precision tools</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 overflow-x-auto scrollbar-none w-full sm:w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-primary text-black'
                : 'text-slate-400 hover:text-white hover:bg-surface-2'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border rounded-xl p-4 sm:p-6"
        >
          {active.component}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
