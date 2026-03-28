import { useMemo } from 'react'
import dayjs from 'dayjs'
import type { Position } from '../../types'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useI18n } from '../../hooks/useI18n'

interface Props {
  positions: Position[]
}

export function PerformanceMetrics({ positions }: Props) {
  const trades = usePortfolioStore((s) => s.trades)
  const { t } = useI18n()

  const firstTradeDate = useMemo(() => {
    const buyTrades = trades.filter((tr) => tr.type === 'buy')
    if (buyTrades.length === 0) return null
    return buyTrades.map((tr) => tr.date).sort()[0]
  }, [trades])

  const { totalValue, totalInvested } = useMemo(() => {
    const totalValue = positions.reduce((s, p) => s + (p.totalValue > 0 ? p.totalValue : p.totalCost), 0)
    const totalInvested = positions.reduce((s, p) => s + p.totalCost, 0)
    return { totalValue, totalInvested }
  }, [positions])

  const holdingDays = useMemo(() => {
    if (!firstTradeDate) return 0
    return dayjs().diff(dayjs(firstTradeDate), 'day')
  }, [firstTradeDate])

  const totalReturnPct = useMemo(() => {
    if (totalInvested === 0) return null
    return ((totalValue - totalInvested) / totalInvested) * 100
  }, [totalValue, totalInvested])

  const cagr = useMemo(() => {
    if (totalReturnPct === null || totalInvested === 0 || holdingDays === 0) return null
    if (holdingDays <= 365) return totalReturnPct
    const ratio = totalValue / totalInvested
    return (Math.pow(ratio, 365 / holdingDays) - 1) * 100
  }, [totalReturnPct, totalInvested, totalValue, holdingDays])

  const fmtPct = (pct: number | null): string => {
    if (pct === null) return '—'
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(2)}%`
  }

  const pctColor = (pct: number | null): string => {
    if (pct === null) return 'text-slate-400'
    return pct >= 0 ? 'text-emerald-400' : 'text-red-400'
  }

  if (trades.length === 0 || !firstTradeDate) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-slate-300 mb-2">{t('perf.title')}</p>
        <p className="text-slate-500 text-sm">{t('perf.noData')}</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-300 mb-4">{t('perf.title')}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label={t('perf.firstTrade')}
          value={dayjs(firstTradeDate).format('YYYY-MM-DD')}
          valueColor="text-slate-200 text-sm"
        />
        <MetricCard
          label={t('perf.holdingDays')}
          value={holdingDays.toLocaleString()}
          sub={t('perf.days', { n: holdingDays })}
        />
        <MetricCard
          label={t('perf.totalReturn')}
          value={fmtPct(totalReturnPct)}
          valueColor={pctColor(totalReturnPct)}
        />
        <MetricCard
          label={t('perf.cagr')}
          value={fmtPct(cagr)}
          valueColor={pctColor(cagr)}
          sub={holdingDays <= 365 ? t('perf.totalReturn') : undefined}
        />
      </div>
    </div>
  )
}

function MetricCard({ label, value, valueColor = 'text-slate-100', sub }: {
  label: string; value: string; valueColor?: string; sub?: string
}) {
  return (
    <div className="bg-surface-800 border border-slate-800 rounded-lg p-3 flex flex-col gap-1">
      <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wide">{label}</span>
      <span className={`text-lg font-bold tabular-nums font-mono ${valueColor}`}>{value}</span>
      {sub && <span className="text-slate-600 text-[10px]">{sub}</span>}
    </div>
  )
}
