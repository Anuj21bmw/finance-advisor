import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, IndianRupee, Check, X } from 'lucide-react'
import { authApi } from '@/api/client'
import { useStore } from '@/store/useStore'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a letter', test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useStore((s) => s.setAuth)

  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = 'Full name is required'
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Minimum 8 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await authApi.register({
        full_name: form.full_name.trim(),
        email: form.email,
        password: form.password,
      })
      setAuth(res.user, res.access_token)
      toast.success(`Account created! Welcome, ${res.user.full_name.split(' ')[0]}!`)
      navigate('/')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = passwordRules.filter((r) => r.test(form.password)).length
  const strengthColors = ['bg-red-500', 'bg-yellow-500', 'bg-green-500']
  const strengthLabels = ['Weak', 'Fair', 'Strong']

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col lg:flex-row">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:w-2/5 xl:w-1/2 bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 relative overflow-hidden flex-col justify-center items-center p-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <IndianRupee className="w-9 h-9 text-slate-900" />
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold text-white mb-4">
            Start Your<br />
            <span className="text-green-400">Wealth Journey</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Join thousands of Indian investors getting AI-powered, personalized financial advice.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[['Free', 'No hidden charges'], ['Secure', 'End-to-end encrypted'], ['Private', 'Data never sold'], ['Smart', 'AI-driven advice']].map(([t, s]) => (
              <div key={t} className="bg-slate-800/50 rounded-xl p-4 text-left border border-slate-700/50">
                <div className="text-green-400 font-semibold text-sm">{t}</div>
                <div className="text-slate-400 text-xs mt-0.5">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md py-6"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-white font-bold text-lg">FinanceAI</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Create account</h2>
          <p className="text-slate-400 mb-7 text-sm">Get started — it's free, no credit card needed</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
              <input
                type="text"
                autoComplete="name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Rahul Sharma"
                className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all text-sm
                  ${errors.full_name ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-700 focus:ring-green-500/30 focus:border-green-500'}`}
              />
              {errors.full_name && <p className="mt-1.5 text-red-400 text-xs">{errors.full_name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="rahul@example.com"
                className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all text-sm
                  ${errors.email ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-700 focus:ring-green-500/30 focus:border-green-500'}`}
              />
              {errors.email && <p className="mt-1.5 text-red-400 text-xs">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all text-sm pr-11
                    ${errors.password ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-700 focus:ring-green-500/30 focus:border-green-500'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-red-400 text-xs">{errors.password}</p>}

              {/* Strength indicator */}
              {form.password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-slate-700'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${passwordStrength === 3 ? 'text-green-400' : passwordStrength === 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {strengthLabels[passwordStrength - 1] || 'Too weak'}
                  </p>
                  <div className="space-y-1">
                    {passwordRules.map((rule) => (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        {rule.test(form.password)
                          ? <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                          : <X className="w-3 h-3 text-slate-600 flex-shrink-0" />}
                        <span className={`text-xs ${rule.test(form.password) ? 'text-slate-400' : 'text-slate-600'}`}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="••••••••"
                className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all text-sm
                  ${errors.confirm ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-700 focus:ring-green-500/30 focus:border-green-500'}`}
              />
              {errors.confirm && <p className="mt-1.5 text-red-400 text-xs">{errors.confirm}</p>}
            </div>

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
                  Creating account…
                </>
              ) : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-green-400 hover:text-green-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>

          <p className="mt-6 text-center text-slate-600 text-xs">
            Educational tool only · Not SEBI registered
          </p>
        </motion.div>
      </div>
    </div>
  )
}
