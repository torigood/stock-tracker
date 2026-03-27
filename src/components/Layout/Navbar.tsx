import { useState, useRef, useEffect } from 'react'
import { TrendingUp } from './Icons'
import { usePortfolioStore } from '../../store/portfolioStore'

type Page = 'dashboard' | 'history' | 'add'

interface NavbarProps {
  page: Page
  onNavigate: (page: Page) => void
  onOpenDataManager: () => void
}

export function Navbar({ page, onNavigate, onOpenDataManager }: NavbarProps) {
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency)
  const setDisplayCurrency = usePortfolioStore((s) => s.setDisplayCurrency)
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate)
  const exchangeRateOverride = usePortfolioStore((s) => s.exchangeRateOverride)
  const setExchangeRateOverride = usePortfolioStore((s) => s.setExchangeRateOverride)
  const portfolios = usePortfolioStore((s) => s.portfolios)
  const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId)
  const addPortfolio = usePortfolioStore((s) => s.addPortfolio)
  const renamePortfolio = usePortfolioStore((s) => s.renamePortfolio)
  const deletePortfolio = usePortfolioStore((s) => s.deletePortfolio)
  const switchPortfolio = usePortfolioStore((s) => s.switchPortfolio)

  const [showPortfolioMenu, setShowPortfolioMenu] = useState(false)
  const [editingRateId, setEditingRateId] = useState<string | null>(null) // 'rate'
  const [rateInput, setRateInput] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')

  const portfolioMenuRef = useRef<HTMLDivElement>(null)

  const effectiveRate = exchangeRateOverride ?? exchangeRate
  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId) ?? portfolios[0]

  // Close portfolio menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (portfolioMenuRef.current && !portfolioMenuRef.current.contains(e.target as Node)) {
        setShowPortfolioMenu(false)
        setRenamingId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleAddPortfolio() {
    const name = window.prompt('새 포트폴리오 이름을 입력하세요')
    if (name?.trim()) {
      addPortfolio(name.trim())
      setShowPortfolioMenu(false)
    }
  }

  function handleRenamePortfolio(id: string, currentName: string) {
    setRenamingId(id)
    setRenameInput(currentName)
  }

  function submitRename(id: string) {
    if (renameInput.trim()) renamePortfolio(id, renameInput.trim())
    setRenamingId(null)
  }

  function handleDeletePortfolio(id: string, name: string) {
    if (portfolios.length <= 1) return
    if (confirm(`"${name}" 포트폴리오를 삭제하시겠습니까?\n포함된 모든 거래 데이터가 삭제됩니다.`)) {
      deletePortfolio(id)
    }
  }

  function handleSetRate() {
    const val = parseFloat(rateInput)
    if (!isNaN(val) && val > 0) {
      setExchangeRateOverride(val)
    }
    setEditingRateId(null)
  }

  function clearRateOverride() {
    setExchangeRateOverride(null)
    setEditingRateId(null)
  }

  return (
    <nav className="bg-surface-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo + Portfolio Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-white font-semibold text-base"
          >
            <span className="text-indigo-400">
              <TrendingUp />
            </span>
            <span className="hidden sm:block">StockTracker</span>
          </button>

          {/* Portfolio switcher */}
          <div ref={portfolioMenuRef} className="relative">
            <button
              onClick={() => setShowPortfolioMenu((v) => !v)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <span className="max-w-[100px] truncate">{activePortfolio?.name ?? '포트폴리오'}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </button>

            {showPortfolioMenu && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-surface-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="py-1">
                  {portfolios.map((p) => (
                    <div key={p.id} className={`flex items-center gap-1 px-3 py-2 ${p.id === activePortfolioId ? 'bg-indigo-900/40' : 'hover:bg-slate-700'}`}>
                      {renamingId === p.id ? (
                        <input
                          autoFocus
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') submitRename(p.id); if (e.key === 'Escape') setRenamingId(null) }}
                          onBlur={() => submitRename(p.id)}
                          className="flex-1 bg-surface-900 border border-indigo-500 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => { switchPortfolio(p.id); setShowPortfolioMenu(false) }}
                          className="flex-1 text-left text-xs text-slate-200 truncate"
                        >
                          {p.id === activePortfolioId && <span className="text-indigo-400 mr-1">●</span>}
                          {p.name}
                        </button>
                      )}
                      <button
                        onClick={() => handleRenamePortfolio(p.id, p.name)}
                        className="p-1 text-slate-600 hover:text-slate-300 rounded transition-colors"
                        title="이름 변경"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {portfolios.length > 1 && (
                        <button
                          onClick={() => handleDeletePortfolio(p.id, p.name)}
                          className="p-1 text-slate-600 hover:text-red-400 rounded transition-colors"
                          title="삭제"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-700 p-2">
                  <button
                    onClick={handleAddPortfolio}
                    className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1.5 text-center transition-colors"
                  >
                    + 새 포트폴리오
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side nav */}
        <div className="flex items-center gap-1">
          <NavLink active={page === 'dashboard'} onClick={() => onNavigate('dashboard')}>
            대시보드
          </NavLink>
          <NavLink active={page === 'history'} onClick={() => onNavigate('history')}>
            거래내역
          </NavLink>

          {/* Exchange rate display + override */}
          <div className="hidden sm:flex items-center gap-1">
            {editingRateId === 'rate' ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="number"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSetRate(); if (e.key === 'Escape') setEditingRateId(null) }}
                  placeholder={String(effectiveRate)}
                  className="w-20 bg-surface-800 border border-indigo-500 rounded px-2 py-0.5 text-xs text-slate-200 font-mono focus:outline-none"
                />
                <button onClick={handleSetRate} className="text-xs text-indigo-400 hover:text-indigo-300">확인</button>
                <button onClick={() => setEditingRateId(null)} className="text-xs text-slate-500 hover:text-slate-300">취소</button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingRateId('rate'); setRateInput(String(effectiveRate)) }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors"
                title="환율 수동 설정"
              >
                $1 = ₩{effectiveRate.toLocaleString('ko-KR')}
                {exchangeRateOverride != null && (
                  <span className="text-amber-400 text-[10px] px-1 py-0.5 bg-amber-900/30 rounded">수동</span>
                )}
              </button>
            )}
            {exchangeRateOverride != null && editingRateId !== 'rate' && (
              <button
                onClick={clearRateOverride}
                className="text-slate-600 hover:text-slate-300 text-xs"
                title="환율 자동으로 되돌리기"
              >×</button>
            )}
          </div>

          {/* Currency toggle */}
          <div className="flex items-center ml-1 rounded-lg overflow-hidden border border-slate-700 text-xs font-medium">
            <button
              onClick={() => setDisplayCurrency('KRW')}
              className={`px-2.5 py-1.5 transition-colors duration-150 ${
                displayCurrency === 'KRW'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              KRW
            </button>
            <button
              onClick={() => setDisplayCurrency('USD')}
              className={`px-2.5 py-1.5 transition-colors duration-150 ${
                displayCurrency === 'USD'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              USD
            </button>
          </div>

          {/* Data manager button */}
          <button
            onClick={onOpenDataManager}
            title="데이터 관리"
            className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v4c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
              <path d="M3 9v4c0 1.66 4.03 3 9 3s9-1.34 9-3V9" />
              <path d="M3 13v4c0 1.66 4.03 3 9 3s9-1.34 9-3v-4" />
            </svg>
          </button>

          <button
            onClick={() => onNavigate('add')}
            className="ml-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 whitespace-nowrap"
          >
            + 거래 입력
          </button>
        </div>
      </div>
    </nav>
  )
}

function NavLink({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
        active
          ? 'bg-slate-700 text-white'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}
