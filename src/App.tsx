import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { Navbar } from './components/Layout/Navbar'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { AddTradePage } from './pages/AddTradePage'
import { StockSearchPage } from './pages/StockSearchPage'
import { DataManager } from './components/DataManager/DataManager'
import { SettingsModal } from './components/Settings/SettingsModal'
import { ChatPanel } from './components/Chat/ChatPanel'
import { usePortfolioStore } from './store/portfolioStore'

type Page = 'dashboard' | 'history' | 'add' | 'search'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [showDataManager, setShowDataManager] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showChat, setShowChat] = useState(false)
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
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {page === 'dashboard' && <DashboardPage />}
        {page === 'history' && <HistoryPage />}
        {page === 'add' && <AddTradePage onDone={() => setPage('dashboard')} />}
        {page === 'search' && (
          <StockSearchPage onAddTrade={() => setPage('add')} />
        )}
      </main>

      <DataManager
        open={showDataManager}
        onClose={() => setShowDataManager(false)}
      />
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <ChatPanel open={showChat} onClose={() => setShowChat(false)} />

      {/* Chat FAB */}
      <button
        onClick={() => setShowChat(true)}
        title="AI 도우미"
        className="fixed bottom-6 right-6 z-30 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <Analytics />
    </div>
  )
}
