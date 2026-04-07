import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Bot, TrendingUp, Calculator,
  FileText, PieChart, ChevronLeft, ChevronRight,
  IndianRupee, LogOut, X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { authApi } from '@/api/client'
import toast from 'react-hot-toast'

const navItems = [
  { path: '/',            label: 'Dashboard',   icon: <LayoutDashboard size={20} /> },
  { path: '/advisor',     label: 'AI Advisor',  icon: <Bot size={20} /> },
  { path: '/markets',     label: 'Markets',     icon: <TrendingUp size={20} /> },
  { path: '/calculators', label: 'Calculators', icon: <Calculator size={20} /> },
  { path: '/documents',   label: 'Documents',   icon: <FileText size={20} /> },
  { path: '/portfolio',   label: 'Portfolio',   icon: <PieChart size={20} /> },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { sidebarExpanded, toggleSidebar, authUser, clearAuth } = useStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    authApi.logout()
    clearAuth()
    toast.success('Logged out')
    navigate('/login')
  }

  const initials = authUser?.full_name
    ? authUser.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const SidebarContent = (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
            <IndianRupee size={16} className="text-slate-900 font-bold" />
          </div>
          <AnimatePresence>
            {(sidebarExpanded || mobileOpen) && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="text-white font-bold text-lg whitespace-nowrap"
              >
                FinanceAI
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {/* Desktop collapse toggle */}
        {sidebarExpanded && !mobileOpen && (
          <button onClick={toggleSidebar} className="ml-auto text-slate-500 hover:text-white transition-colors p-1 rounded">
            <ChevronLeft size={16} />
          </button>
        )}
        {/* Mobile close */}
        {mobileOpen && onMobileClose && (
          <button onClick={onMobileClose} className="ml-auto text-slate-500 hover:text-white p-1 rounded">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Desktop expand toggle when collapsed */}
      {!sidebarExpanded && !mobileOpen && (
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 bg-slate-800 border border-slate-700 rounded-full p-1 text-slate-500 hover:text-white transition-colors z-10"
        >
          <ChevronRight size={12} />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onMobileClose}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative',
                    isActive
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white border border-transparent'
                  )}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <AnimatePresence>
                    {(sidebarExpanded || mobileOpen) && (
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
                  {!sidebarExpanded && !mobileOpen && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-700 p-3 flex-shrink-0 space-y-1">
        {/* User info */}
        <div className={clsx('flex items-center gap-2.5', !sidebarExpanded && !mobileOpen && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-green-400 text-xs font-bold">{initials}</span>
          </div>
          <AnimatePresence>
            {(sidebarExpanded || mobileOpen) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 flex-1">
                <p className="text-white text-xs font-medium truncate">{authUser?.full_name || 'Investor'}</p>
                <p className="text-slate-500 text-xs truncate">{authUser?.email || ''}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 w-full group relative',
            !sidebarExpanded && !mobileOpen && 'justify-center'
          )}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {(sidebarExpanded || mobileOpen) && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm whitespace-nowrap">
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
          {!sidebarExpanded && !mobileOpen && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
              Sign out
            </div>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarExpanded ? 240 : 64 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden lg:flex fixed left-0 top-0 h-screen bg-slate-800 border-r border-slate-700 z-50 flex-col overflow-hidden"
      >
        {SidebarContent}
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-64 bg-slate-800 border-r border-slate-700 z-50 flex flex-col overflow-hidden"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
