import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User, Bell, Shield, Palette, Database, Info, ChevronRight,
  Check, Save, LogOut,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useStore } from '@/store/useStore'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/client'

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </motion.div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={clsx(
        'w-10 h-5 rounded-full transition-colors flex-shrink-0 relative',
        enabled ? 'bg-primary' : 'bg-slate-700'
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function SettingRow({
  label, description, children,
}: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-slate-500 text-xs mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { authUser, userProfile, setUserProfile, clearAuth } = useStore()
  const navigate = useNavigate()

  // Notification prefs
  const [notifs, setNotifs] = useState({
    marketAlerts: true,
    priceAlerts: true,
    newsDigest: false,
    weeklyReport: true,
    portfolioUpdates: true,
  })

  // Display prefs
  const [display, setDisplay] = useState({
    compactNumbers: false,
    showChangePercent: true,
    autoRefresh: true,
  })

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: authUser?.full_name ?? '',
    email: authUser?.email ?? '',
  })
  const [profileSaved, setProfileSaved] = useState(false)

  const saveProfile = () => {
    // In a full implementation this would call PATCH /api/auth/me
    setProfileSaved(true)
    toast.success('Profile updated')
    setTimeout(() => setProfileSaved(false), 2000)
  }

  const handleLogout = () => {
    authApi.logout()
    clearAuth()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-white font-semibold text-lg">Settings</h2>
        <p className="text-slate-400 text-xs mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Section title="Profile" icon={<User size={16} />}>
        <SettingRow label="Full Name">
          <input
            value={profileForm.full_name}
            onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-white text-sm focus:border-primary outline-none transition-colors w-52"
          />
        </SettingRow>
        <SettingRow label="Email">
          <input
            value={profileForm.email}
            onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-white text-sm focus:border-primary outline-none transition-colors w-52"
            type="email"
          />
        </SettingRow>
        <SettingRow label="Member since">
          <span className="text-slate-400 text-sm">{authUser?.created_at ? new Date(authUser.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}</span>
        </SettingRow>
        <button
          onClick={saveProfile}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            profileSaved
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'bg-primary text-black hover:bg-primary/90'
          )}
        >
          {profileSaved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save Changes</>}
        </button>
      </Section>

      {/* Investor Profile */}
      <Section title="Investor Profile" icon={<Database size={16} />}>
        <SettingRow label="Age" description="Used for personalized advice">
          <input
            type="number"
            value={userProfile.age}
            onChange={(e) => setUserProfile({ age: parseInt(e.target.value) || 30 })}
            min={18} max={80}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-white text-sm focus:border-primary outline-none w-24 text-center"
          />
        </SettingRow>
        <SettingRow label="Annual Income (₹)" description="For tax calculations">
          <input
            type="number"
            value={userProfile.income}
            onChange={(e) => setUserProfile({ income: parseFloat(e.target.value) || 0 })}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-white text-sm focus:border-primary outline-none w-36"
          />
        </SettingRow>
        <SettingRow label="Risk Appetite">
          <div className="flex gap-1.5">
            {(['low', 'moderate', 'high'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setUserProfile({ risk_appetite: r })}
                className={clsx(
                  'px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors',
                  userProfile.risk_appetite === r
                    ? 'bg-primary text-black'
                    : 'bg-background border border-border text-slate-400 hover:border-slate-500'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Investment Horizon" description="In years">
          <input
            type="number"
            value={userProfile.horizon}
            onChange={(e) => setUserProfile({ horizon: parseInt(e.target.value) || 10 })}
            min={1} max={40}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-white text-sm focus:border-primary outline-none w-24 text-center"
          />
        </SettingRow>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={<Bell size={16} />}>
        {([
          { key: 'marketAlerts', label: 'Market Alerts', desc: 'Get notified when Nifty moves >1%' },
          { key: 'priceAlerts', label: 'Price Alerts', desc: 'Individual stock/fund price alerts' },
          { key: 'newsDigest', label: 'Daily News Digest', desc: 'Morning financial news summary' },
          { key: 'weeklyReport', label: 'Weekly Portfolio Report', desc: 'Weekly summary of your portfolio' },
          { key: 'portfolioUpdates', label: 'Portfolio Updates', desc: 'Alerts when NAV changes significantly' },
        ] as { key: keyof typeof notifs; label: string; desc: string }[]).map(({ key, label, desc }) => (
          <SettingRow key={key} label={label} description={desc}>
            <Toggle enabled={notifs[key]} onChange={(v) => { setNotifs((n) => ({ ...n, [key]: v })); toast.success(`${label} ${v ? 'enabled' : 'disabled'}`) }} />
          </SettingRow>
        ))}
      </Section>

      {/* Display */}
      <Section title="Display" icon={<Palette size={16} />}>
        {([
          { key: 'showChangePercent', label: 'Show Change %', desc: 'Display percentage change alongside points' },
          { key: 'autoRefresh', label: 'Auto-refresh Market Data', desc: 'Automatically refresh prices every 30s' },
          { key: 'compactNumbers', label: 'Compact Numbers', desc: 'Show ₹1.2L instead of ₹1,20,000' },
        ] as { key: keyof typeof display; label: string; desc: string }[]).map(({ key, label, desc }) => (
          <SettingRow key={key} label={label} description={desc}>
            <Toggle enabled={display[key]} onChange={(v) => setDisplay((d) => ({ ...d, [key]: v }))} />
          </SettingRow>
        ))}
      </Section>

      {/* Security */}
      <Section title="Security" icon={<Shield size={16} />}>
        <SettingRow label="Password" description="Change your account password">
          <button
            onClick={() => toast('Password change coming soon', { icon: '🔐' })}
            className="flex items-center gap-1 text-primary text-sm hover:underline"
          >
            Change <ChevronRight size={14} />
          </button>
        </SettingRow>
        <SettingRow label="Two-Factor Auth" description="Add an extra layer of security">
          <button
            onClick={() => toast('2FA coming soon', { icon: '🔐' })}
            className="flex items-center gap-1 text-primary text-sm hover:underline"
          >
            Setup <ChevronRight size={14} />
          </button>
        </SettingRow>
        <SettingRow label="Active Sessions" description="Manage where you're logged in">
          <button
            onClick={() => toast('Session management coming soon', { icon: '📱' })}
            className="flex items-center gap-1 text-slate-400 text-sm hover:text-white"
          >
            View <ChevronRight size={14} />
          </button>
        </SettingRow>
      </Section>

      {/* About */}
      <Section title="About" icon={<Info size={16} />}>
        <SettingRow label="Version">
          <span className="text-slate-400 text-sm font-mono">2.0.0</span>
        </SettingRow>
        <SettingRow label="AI Model">
          <span className="text-slate-400 text-sm">Llama-3.1-8B (Groq)</span>
        </SettingRow>
        <SettingRow label="Data Sources">
          <span className="text-slate-400 text-sm">NSE · BSE · AMFI India</span>
        </SettingRow>
        <SettingRow label="Disclaimer">
          <span className="text-slate-500 text-xs max-w-xs text-right">For informational purposes only. Not financial advice.</span>
        </SettingRow>
      </Section>

      {/* Danger zone */}
      <div className="bg-surface border border-red-500/20 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-white font-medium text-sm">Sign Out</p>
          <p className="text-slate-500 text-xs">Sign out of your account on this device</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  )
}
