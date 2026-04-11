import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, Settings, TrendingUp, TrendingDown, Menu, X,
  TrendingUp as TUp, AlertTriangle, CheckCircle, Newspaper, PieChart,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { marketApi } from '@/api/client'

interface NavbarProps { onMobileMenuClick?: () => void }

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/advisor': 'AI Advisor',
  '/markets': 'Markets',
  '/calculators': 'Calculators',
  '/documents': 'Documents',
  '/portfolio': 'Portfolio',
  '/settings': 'Settings',
}

interface TickerItem {
  symbol: string
  value: number
  change_pct: number
}

// ── Static notifications (replace with a real endpoint later) ─────────────────

interface Notification {
  id: number
  type: 'alert' | 'news' | 'portfolio' | 'success'
  title: string
  body: string
  time: string
  read: boolean
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    type: 'alert',
    title: 'Market Alert',
    body: 'NIFTY 50 dropped more than 1% today. Review your portfolio.',
    time: '10 min ago',
    read: false,
  },
  {
    id: 2,
    type: 'news',
    title: 'RBI Policy Update',
    body: 'RBI holds repo rate at 6.5% — neutral stance signals possible cuts ahead.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: 3,
    type: 'portfolio',
    title: 'Portfolio Update',
    body: 'Your SBI Small Cap Fund NAV increased by ₹2.14 today.',
    time: '4 hours ago',
    read: true,
  },
  {
    id: 4,
    type: 'success',
    title: 'SIP Reminder',
    body: 'Monthly SIP of ₹10,000 is scheduled for 5th April.',
    time: '1 day ago',
    read: true,
  },
  {
    id: 5,
    type: 'news',
    title: 'Gold at Record High',
    body: 'Gold crosses ₹90,000/10g on MCX — safe-haven demand surges.',
    time: '1 day ago',
    read: true,
  },
]

function notifIcon(type: Notification['type']) {
  if (type === 'alert')     return <AlertTriangle size={14} className="text-amber-400" />
  if (type === 'news')      return <Newspaper size={14} className="text-blue-400" />
  if (type === 'portfolio') return <PieChart size={14} className="text-purple-400" />
  if (type === 'success')   return <CheckCircle size={14} className="text-primary" />
  return <TUp size={14} className="text-slate-400" />
}

// ── Notifications Dropdown ────────────────────────────────────────────────────

function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)

  const markAllRead = () => setNotifications((n) => n.map((x) => ({ ...x, read: true })))
  const markRead = (id: number) => setNotifications((n) => n.map((x) => x.id === id ? { ...x, read: true } : x))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <span className="text-white font-semibold text-sm">Notifications</span>
        <div className="flex items-center gap-2">
          <button onClick={markAllRead} className="text-primary text-xs hover:underline">Mark all read</button>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-0.5">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/50">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            className={clsx(
              'px-4 py-3 flex gap-3 cursor-pointer transition-colors hover:bg-slate-700/40',
              !n.read && 'bg-slate-700/20'
            )}
          >
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              {notifIcon(n.type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className={clsx('text-xs font-semibold truncate', n.read ? 'text-slate-300' : 'text-white')}>
                  {n.title}
                </p>
                {!n.read && <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />}
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">{n.body}</p>
              <p className="text-slate-600 text-xs mt-1">{n.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-700 text-center">
        <button className="text-primary text-xs hover:underline">View all notifications</button>
      </div>
    </motion.div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export default function Navbar({ onMobileMenuClick }: NavbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const title = PAGE_TITLES[location.pathname] ?? 'Finance Advisor'
  const [tickerData, setTickerData] = useState<TickerItem[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifsRef = useRef<HTMLDivElement>(null)

  const unreadCount = INITIAL_NOTIFICATIONS.filter((n) => !n.read).length

  const { data: indicesData } = useQuery({
    queryKey: ['market-indices-ticker'],
    queryFn: marketApi.indices,
    refetchInterval: 30000,
    staleTime: 25000,
  })

  useEffect(() => {
    if (indicesData?.indices) {
      setTickerData(
        indicesData.indices
          .filter((i) => ['NIFTY 50', 'SENSEX', 'NIFTY BANK', 'GOLD'].includes(i.symbol))
          .map((i) => ({ symbol: i.symbol, value: i.current, change_pct: i.change_pct }))
      )
    }
  }, [indicesData])

  // Close notifs when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    if (showNotifs) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])

  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-4 sm:px-6 gap-3 sm:gap-4 sticky top-0 z-40">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMobileMenuClick}
        className="lg:hidden text-slate-400 hover:text-white transition-colors p-1 flex-shrink-0"
      >
        <Menu size={22} />
      </button>

      {/* Page title */}
      <h1 className="text-white font-semibold text-base sm:text-lg min-w-[100px] sm:min-w-[140px]">{title}</h1>

      {/* Market ticker strip */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
          {tickerData.map((item) => (
            <div key={item.symbol} className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-slate-400 text-xs font-medium">{item.symbol}</span>
              <span className="text-white text-sm font-mono font-medium">
                {item.symbol === 'USD/INR'
                  ? item.value.toFixed(2)
                  : item.symbol === 'GOLD'
                  ? `$${item.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                  : item.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              <span
                className={clsx(
                  'flex items-center gap-0.5 text-xs font-medium',
                  item.change_pct >= 0 ? 'text-primary' : 'text-danger'
                )}
              >
                {item.change_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(item.change_pct).toFixed(2)}%
              </span>
            </div>
          ))}

          {tickerData.length === 0 && (
            <div className="flex items-center gap-6">
              {['NIFTY 50', 'SENSEX', 'NIFTY BANK'].map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-xs">{s}</span>
                  <div className="w-16 h-3 bg-surface-2 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto flex-shrink-0">
        {/* Notifications */}
        <div ref={notifsRef} className="relative">
          <button
            onClick={() => setShowNotifs((s) => !s)}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-surface-2 flex items-center justify-center transition-colors relative"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-black text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <NotificationsDropdown onClose={() => setShowNotifs(false)} />
            )}
          </AnimatePresence>
        </div>

        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            location.pathname === '/settings'
              ? 'bg-primary/20 text-primary'
              : 'text-slate-400 hover:text-white hover:bg-surface-2'
          )}
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  )
}
