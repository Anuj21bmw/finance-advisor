import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import AdvisorPage from '@/pages/AdvisorPage'
import MarketsPage from '@/pages/MarketsPage'
import CalculatorsPage from '@/pages/CalculatorsPage'
import DocumentsPage from '@/pages/DocumentsPage'
import PortfolioPage from '@/pages/PortfolioPage'

export default function App() {
  return (
    <Routes>
      {/* ── Public routes ── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ── Protected routes (require JWT) ── */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="advisor" element={<AdvisorPage />} />
        <Route path="markets" element={<MarketsPage />} />
        <Route path="calculators" element={<CalculatorsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
