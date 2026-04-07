import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout/Layout'
import DashboardPage from '@/pages/DashboardPage'
import AdvisorPage from '@/pages/AdvisorPage'
import MarketsPage from '@/pages/MarketsPage'
import CalculatorsPage from '@/pages/CalculatorsPage'
import DocumentsPage from '@/pages/DocumentsPage'
import PortfolioPage from '@/pages/PortfolioPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="advisor" element={<AdvisorPage />} />
        <Route path="markets" element={<MarketsPage />} />
        <Route path="calculators" element={<CalculatorsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
      </Route>
    </Routes>
  )
}
