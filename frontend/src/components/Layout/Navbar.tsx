import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Settings, TrendingUp, TrendingDown, Menu } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { marketApi } from '@/api/client'

interface NavbarProps { onMobileMenuClick?: () => void }

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/advisor': 'AI Advisor',
  '/markets': 'Markets',
  '/calculators': 'Calculators',
  '/documents': 'Documents',
  '/portfolio': 'Portfolio',
}

interface TickerItem {
  symbol: string
  value: number
  change_pct: number
}

export default function Navbar({ onMobileMenuClick }: NavbarProps) {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'Finance Advisor'
  const [tickerData, setTickerData] = useState<TickerItem[]>([])

  const { data: indicesData } = useQuery({
    queryKey: ['market-indices-ticker'],
    queryFn: marketApi.indices,
    refetchInterval: 5000,
    staleTime: 4000,
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
                  ? `₹${item.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                  : item.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              <span
                className={clsx(
                  'flex items-center gap-0.5 text-xs font-medium',
                  item.change_pct >= 0 ? 'text-primary' : 'text-danger'
                )}
              >
                {item.change_pct >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
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
        <button className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-surface-2 flex items-center justify-center transition-colors relative">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
        </button>
        <button className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-surface-2 flex items-center justify-center transition-colors">
          <Settings size={16} />
        </button>
      </div>
    </header>
  )
}
