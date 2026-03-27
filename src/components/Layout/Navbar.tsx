import { TrendingUp } from './Icons'

type Page = 'dashboard' | 'history' | 'add'

interface NavbarProps {
  page: Page
  onNavigate: (page: Page) => void
}

export function Navbar({ page, onNavigate }: NavbarProps) {
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
