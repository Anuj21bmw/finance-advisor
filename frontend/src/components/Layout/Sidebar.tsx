import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Bot,
  TrendingUp,
  Calculator,
  FileText,
  PieChart,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  User,
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/advisor', label: 'AI Advisor', icon: <Bot size={20} /> },
  { path: '/markets', label: 'Markets', icon: <TrendingUp size={20} /> },
  { path: '/calculators', label: 'Calculators', icon: <Calculator size={20} /> },
  { path: '/documents', label: 'Documents', icon: <FileText size={20} /> },
  { path: '/portfolio', label: 'Portfolio', icon: <PieChart size={20} /> },
]

export default function Sidebar() {
  const { sidebarExpanded, toggleSidebar, userProfile } = useStore()
  const location = useLocation()

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarExpanded ? 240 : 64 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-surface border-r border-border z-50 flex flex-col overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <IndianRupee size={16} className="text-black font-bold" />
          </div>
          <AnimatePresence>
            {sidebarExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="text-white font-bold text-lg whitespace-nowrap"
              >
                FinanceAI
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className={clsx(
            'ml-auto text-muted hover:text-white transition-colors p-1 rounded',
            !sidebarExpanded && 'hidden'
          )}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Collapsed toggle */}
      {!sidebarExpanded && (
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 bg-surface border border-border rounded-full p-1 text-muted hover:text-white transition-colors z-10"
        >
          <ChevronRight size={12} />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-slate-400 hover:bg-surface-2 hover:text-white border border-transparent'
                  )}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <AnimatePresence>
                    {sidebarExpanded && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Tooltip for collapsed state */}
                  {!sidebarExpanded && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User profile section */}
      <div className="border-t border-border p-3 flex-shrink-0">
        <div className={clsx('flex items-center gap-2', !sidebarExpanded && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-primary" />
          </div>
          <AnimatePresence>
            {sidebarExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0"
              >
                <p className="text-white text-xs font-medium truncate">Investor Profile</p>
                <p className="text-muted text-xs truncate capitalize">
                  {userProfile.risk_appetite} Risk · Age {userProfile.age}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
