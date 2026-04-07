import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, TrendingUp, IndianRupee, Shield, Sparkles } from 'lucide-react'
import { authApi } from '@/api/client'
import { useStore } from '@/store/useStore'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useStore((s) => s.setAuth)

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await authApi.login({ email: form.email, password: form.password })
      setAuth(res.user, res.access_token)
      toast.success(`Welcome back, ${res.user.full_name.split(' ')[0]}!`)
      navigate('/')
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: TrendingUp, text: 'AI-powered investment advice' },
    { icon: IndianRupee, text: 'Personalized for Indian investors' },
    { icon: Shield, text: 'Bank-grade security & privacy' },
    { icon: Sparkles, text: 'LangGraph multi-agent analysis' },
  ]

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col lg:flex-row">
      {/* ── Left Panel (branding) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex-col justify-between p-12">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -right-20 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
            <IndianRupee className="w-6 h-6 text-slate-900" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">FinanceAI</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl xl:text-5xl font-bold text-white leading-tight"
          >
            Your AI-Powered<br />
            <span className="text-green-400">Financial Advisor</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-slate-400 text-lg max-w-md"
          >
            Get personalized investment advice powered by Llama-3.1, RAG on your bank statements, and live Indian market data.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-3 pt-2"
          >
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 bg-green-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative z-10 flex gap-8"
        >
          {[['5 AI Agents', 'Working in parallel'], ['RAG Pipeline', 'On your documents'], ['Live Market', 'NSE/BSE data']].map(([title, sub]) => (
            <div key={title}>
              <div className="text-white font-semibold text-sm">{title}</div>
              <div className="text-slate-500 text-xs">{sub}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right Panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-white font-bold text-lg">FinanceAI</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-slate-400 mb-8 text-sm">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all text-sm
                  ${errors.email ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-700 focus:ring-green-500/30 focus:border-green-500'}`}
              />
              {errors.email && <p className="mt-1.5 text-red-400 text-xs">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-300">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all text-sm pr-11
                    ${errors.password ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-700 focus:ring-green-500/30 focus:border-green-500'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-red-400 text-xs">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-green-400 hover:text-green-300 font-medium transition-colors">
              Create account
            </Link>
          </p>

          <p className="mt-8 text-center text-slate-600 text-xs">
            By signing in, you agree that this is an educational tool.<br />
            Not SEBI registered. Not financial advice.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
