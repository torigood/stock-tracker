import type { PortfolioSummary } from '../../types'
import { formatPercent } from '../../utils/calculations'
import { useCurrency } from '../../hooks/useCurrency'
import { useI18n } from '../../hooks/useI18n'

interface Props {
  summary: PortfolioSummary
}

export function SummaryCards({ summary }: Props) {
  const { totalInvested, totalValue, totalProfitLoss, totalProfitLossPercent, totalRealizedPL } = summary
  const { displayCurrency, fmtAmount } = useCurrency()
  const { t } = useI18n()
  const hasPrices = totalValue > 0

  const displayBase = displayCurrency as 'KRW' | 'USD'

  const plColor =
    totalProfitLoss > 0
      ? 'text-emerald-400'
      : totalProfitLoss < 0
      ? 'text-red-400'
      : 'text-slate-400'

  const realizedColor =
    totalRealizedPL > 0
      ? 'text-emerald-400'
      : totalRealizedPL < 0
      ? 'text-red-400'
      : 'text-slate-400'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label={t('summary.totalValue')}
        value={hasPrices ? fmtAmount(totalValue, displayBase) : fmtAmount(totalInvested, displayBase)}
        sub={hasPrices ? undefined : t('summary.beforeFetch')}
        valueClass="text-white"
      />
      <Card
        label={t('summary.totalPL')}
        value={hasPrices ? (totalProfitLoss >= 0 ? '+' : '') + fmtAmount(totalProfitLoss, displayBase) : '–'}
        sub={hasPrices ? formatPercent(totalProfitLossPercent) : t('summary.needFetch')}
        valueClass={hasPrices ? plColor : 'text-slate-500'}
        subClass={hasPrices ? plColor : 'text-slate-500'}
      />
      <Card
        label={t('summary.totalInvested')}
        value={fmtAmount(totalInvested, displayBase)}
        sub={t('summary.positions', { n: summary.positions.length })}
        valueClass="text-white"
      />
      <Card
        label={t('summary.realizedPL')}
        value={totalRealizedPL !== 0
          ? (totalRealizedPL >= 0 ? '+' : '') + fmtAmount(totalRealizedPL, displayBase)
          : '–'}
        sub={totalRealizedPL !== 0 ? t('summary.realizedBasis') : t('summary.noSells')}
        valueClass={totalRealizedPL !== 0 ? realizedColor : 'text-slate-500'}
        subClass="text-slate-500"
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
