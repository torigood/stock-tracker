import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { usePortfolioStore } from '../../store/portfolioStore'
import { computePortfolioHistory } from '../../utils/calculations'
import { useCurrency } from '../../hooks/useCurrency'

function formatDateAbbrev(date: string): string {
  // 'YYYY-MM-DD' → 'YY.MM'
  const parts = date.split('-')
  if (parts.length < 2) return date
  return parts[0].slice(2) + '.' + parts[1]
}

function abbreviate(amount: number, currency: 'KRW' | 'USD'): string {
  const abs = Math.abs(amount)
  if (currency === 'KRW') {
    if (abs >= 1_000_000_000) return (abs / 1_000_000_000).toFixed(1) + 'B'
    if (abs >= 1_000_000) return (abs / 1_000_000).toFixed(0) + 'M'
    if (abs >= 1_000) return (abs / 1_000).toFixed(0) + 'K'
    return String(Math.round(abs))
  }
  if (abs >= 1_000_000) return (abs / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return (abs / 1_000).toFixed(1) + 'K'
  return abs.toFixed(0)
}

interface TooltipPayload {
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
  displayCurrency: 'KRW' | 'USD'
  fmtAmount: (amount: number, currency: 'KRW' | 'USD') => string
}

function CustomTooltip({ active, payload, label, displayCurrency, fmtAmount }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-surface-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-mono font-semibold text-indigo-300">
        {fmtAmount(payload[0].value, displayCurrency)}
      </p>
    </div>
  )
}

export function PortfolioChart() {
  const trades = usePortfolioStore((s) => s.trades)
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency)
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate)
  const { fmtAmount } = useCurrency()

  const data = computePortfolioHistory(trades, displayCurrency, exchangeRate)

  if (data.length < 2) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-slate-300 mb-1">투자금 누적 추이</p>
        <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">
          거래 데이터가 부족합니다.
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-300 mb-4">투자금 누적 추이</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateAbbrev}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v: number) => abbreviate(v, displayCurrency)}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            content={
              <CustomTooltip
                displayCurrency={displayCurrency}
                fmtAmount={fmtAmount}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="invested"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#portfolioGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1', stroke: '#818cf8', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
