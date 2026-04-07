import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useStore } from '@/store/useStore'

export default function Layout() {
  const { sidebarExpanded } = useStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Desktop sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content — offset by sidebar on desktop, full-width on mobile */}
      <motion.div
        initial={false}
        animate={{ marginLeft: sidebarExpanded ? 240 : 64 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex-1 flex flex-col min-h-screen min-w-0 lg:ml-auto"
        style={{ marginLeft: undefined }} // let motion handle it on lg+
      >
        {/* Override motion marginLeft on mobile (always 0) */}
        <div className="flex-1 flex flex-col min-h-screen lg:hidden" style={{ marginLeft: 0 }}>
          <Navbar onMobileMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>

        {/* Desktop layout */}
        <div className="hidden lg:flex flex-col flex-1 min-h-screen">
          <Navbar onMobileMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </motion.div>
    </div>
  )
}
