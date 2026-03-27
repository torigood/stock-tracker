import type { PortfolioSummary } from '../../types'
import { formatPercent } from '../../utils/calculations'

interface Props {
  summary: PortfolioSummary
}

// We use USD formatting for mixed portfolio summary
function fmtAny(n: number) {
  // Simple large-number display without currency assumption at portfolio level
  const abs = Math.abs(n)
  let str: string
  if (abs >= 1_000_000) {
    str = (abs / 1_000_000).toFixed(2) + 'M'
  } else if (abs >= 1_000) {
    str = abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
  } else {
    str = abs.toFixed(2)
  }
  return (n < 0 ? '-' : '') + str
}

export function SummaryCards({ summary }: Props) {
  const { totalInvested, totalValue, totalProfitLoss, totalProfitLossPercent } = summary
  const hasPrices = totalValue > 0

  const plColor =
    totalProfitLoss > 0
      ? 'text-emerald-400'
      : totalProfitLoss < 0
      ? 'text-red-400'
      : 'text-slate-400'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card
        label="총 평가금액"
        value={hasPrices ? fmtAny(totalValue) : fmtAny(totalInvested)}
        sub={hasPrices ? undefined : '시세 조회 전'}
        valueClass="text-white"
      />
      <Card
        label="총 수익금"
        value={hasPrices ? (totalProfitLoss >= 0 ? '+' : '') + fmtAny(totalProfitLoss) : '–'}
        sub={hasPrices ? formatPercent(totalProfitLossPercent) : '시세 조회 필요'}
        valueClass={hasPrices ? plColor : 'text-slate-500'}
        subClass={hasPrices ? plColor : 'text-slate-500'}
      />
      <Card
        label="총 투자금액"
        value={fmtAny(totalInvested)}
        sub={`${summary.positions.length}개 종목`}
        valueClass="text-white"
      />
    </div>
  )
}

function Card({
  label,
  value,
  sub,
  valueClass = 'text-white',
  subClass = 'text-slate-500',
}: {
  label: string
  value: string
  sub?: string
  valueClass?: string
  subClass?: string
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold font-mono ${valueClass}`}>{value}</p>
      {sub && <p className={`text-sm mt-1 ${subClass}`}>{sub}</p>}
    </div>
  )
}
