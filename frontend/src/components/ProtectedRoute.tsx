import { Navigate, useLocation } from 'react-router-dom'
import { useStore } from '@/store/useStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const authToken = useStore((s) => s.authToken)
  const location = useLocation()

  // Also check localStorage directly (handles page refresh before store rehydrates)
  const token = authToken || localStorage.getItem('fa_token')

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
