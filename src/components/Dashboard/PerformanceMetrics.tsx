import { useMemo } from 'react'
import dayjs from 'dayjs'
import type { Position } from '../../types'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useI18n } from '../../hooks/useI18n'
import { computeYOC, computeMDD, computeSharpe } from '../../utils/calculations'

interface Props {
  positions: Position[]
}

export function PerformanceMetrics({ positions }: Props) {
  const trades = usePortfolioStore((s) => s.trades)
  const snapshots = usePortfolioStore((s) => s.snapshots)
  const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId)
  const riskFreeRate = usePortfolioStore((s) => s.riskFreeRate)
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency)
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate)
  const { t } = useI18n()

  const activeSnapshots = useMemo(
    () => snapshots[activePortfolioId] ?? [],
    [snapshots, activePortfolioId]
  )

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

  const yoc = useMemo(
    () => computeYOC(trades, positions, displayCurrency, exchangeRate),
    [trades, positions, displayCurrency, exchangeRate]
  )

  const mdd = useMemo(
    () => computeMDD(activeSnapshots),
    [activeSnapshots]
  )

  const sharpe = useMemo(
    () => computeSharpe(activeSnapshots, riskFreeRate),
    [activeSnapshots, riskFreeRate]
  )

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
        <MetricCard
          label={t('perf.yoc')}
          value={yoc !== null ? `+${yoc.toFixed(2)}%` : t('perf.insufficientData')}
          valueColor={yoc !== null ? 'text-sky-400' : 'text-slate-500'}
        />
        <MetricCard
          label={t('perf.mdd')}
          value={mdd !== null ? `-${mdd.toFixed(2)}%` : t('perf.insufficientData')}
          valueColor={mdd !== null ? 'text-red-400' : 'text-slate-500'}
        />
        <MetricCard
          label={t('perf.sharpe')}
          value={sharpe !== null ? sharpe.toFixed(2) : t('perf.insufficientData')}
          valueColor={sharpe !== null ? (sharpe >= 1 ? 'text-emerald-400' : sharpe >= 0 ? 'text-slate-200' : 'text-red-400') : 'text-slate-500'}
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
