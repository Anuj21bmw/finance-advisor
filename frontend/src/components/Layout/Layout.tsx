import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useStore } from '@/store/useStore'

export default function Layout() {
  const { sidebarExpanded } = useStore()

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <motion.div
        initial={false}
        animate={{ marginLeft: sidebarExpanded ? 240 : 64 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex-1 flex flex-col min-h-screen min-w-0"
      >
        <Navbar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </motion.div>
    </div>
  )
}
