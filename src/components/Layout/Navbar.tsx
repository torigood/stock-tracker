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

  return (
    <nav className="bg-surface-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-white font-semibold text-base"
        >
          <span className="text-indigo-400">
            <TrendingUp />
          </span>
          <span>StockTracker</span>
        </button>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <NavLink active={page === 'dashboard'} onClick={() => onNavigate('dashboard')}>
            대시보드
          </NavLink>
          <NavLink active={page === 'history'} onClick={() => onNavigate('history')}>
            거래내역
          </NavLink>

          {/* 현재 환율 */}
          <span className="text-xs text-slate-500 font-mono hidden sm:block">
            $1 = ₩{exchangeRate.toLocaleString('ko-KR')}
          </span>

          {/* Currency toggle */}
          <div className="flex items-center ml-2 rounded-lg overflow-hidden border border-slate-700 text-xs font-medium">
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v4c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
              <path d="M3 9v4c0 1.66 4.03 3 9 3s9-1.34 9-3V9" />
              <path d="M3 13v4c0 1.66 4.03 3 9 3s9-1.34 9-3v-4" />
            </svg>
          </button>

          <button
            onClick={() => onNavigate('add')}
            className="ml-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors duration-150"
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
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
        active
          ? 'bg-slate-700 text-white'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}
