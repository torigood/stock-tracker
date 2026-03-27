import { useState, useEffect } from 'react'
import { Navbar } from './components/Layout/Navbar'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { AddTradePage } from './pages/AddTradePage'
import { DataManager } from './components/DataManager/DataManager'
import { usePortfolioStore } from './store/portfolioStore'

type Page = 'dashboard' | 'history' | 'add'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [showDataManager, setShowDataManager] = useState(false)
  const setExchangeRate = usePortfolioStore((s) => s.setExchangeRate)
  const theme = usePortfolioStore((s) => s.theme)

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [theme])

  useEffect(() => {
    // exchangerate-api.com: free, no API key, CORS-friendly
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then((res) => res.json())
      .then((data: unknown) => {
        const rate =
          data &&
          typeof data === 'object' &&
          'rates' in data &&
          typeof (data as { rates: Record<string, number> }).rates?.KRW === 'number'
            ? (data as { rates: Record<string, number> }).rates.KRW
            : null
        if (rate) setExchangeRate(Math.round(rate))
      })
      .catch(() => {})
  }, [setExchangeRate])

  return (
    <div className="min-h-screen bg-surface-950">
      <Navbar
        page={page}
        onNavigate={setPage}
        onOpenDataManager={() => setShowDataManager(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {page === 'dashboard' && <DashboardPage />}
        {page === 'history' && <HistoryPage />}
        {page === 'add' && <AddTradePage onDone={() => setPage('dashboard')} />}
      </main>

      <DataManager
        open={showDataManager}
        onClose={() => setShowDataManager(false)}
      />
    </div>
  )
}
