import { useState } from 'react'
import { Navbar } from './components/Layout/Navbar'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { AddTradePage } from './pages/AddTradePage'

type Page = 'dashboard' | 'history' | 'add'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  return (
    <div className="min-h-screen bg-surface-950">
      <Navbar page={page} onNavigate={setPage} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {page === 'dashboard' && <DashboardPage />}
        {page === 'history' && <HistoryPage />}
        {page === 'add' && <AddTradePage onDone={() => setPage('dashboard')} />}
      </main>
    </div>
  )
}
