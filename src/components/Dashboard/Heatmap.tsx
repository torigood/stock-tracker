import type { Position } from '../../types'
import { formatPercent } from '../../utils/calculations'
import { useCurrency } from '../../hooks/useCurrency'
import { useI18n } from '../../hooks/useI18n'

interface Props {
  positions: Position[]
}

function plToColor(pct: number, hasPrice: boolean): string {
  if (!hasPrice) return 'bg-slate-700 text-slate-400'
  if (pct >= 20) return 'bg-emerald-600 text-white'
  if (pct >= 10) return 'bg-emerald-700 text-emerald-100'
  if (pct >= 3) return 'bg-emerald-900 text-emerald-300'
  if (pct >= 0) return 'bg-emerald-950 text-emerald-400'
  if (pct >= -3) return 'bg-red-950 text-red-400'
  if (pct >= -10) return 'bg-red-900 text-red-300'
  if (pct >= -20) return 'bg-red-700 text-red-100'
  return 'bg-red-600 text-white'
}

export function Heatmap({ positions }: Props) {
  const { displayCurrency, fmtAbbrev } = useCurrency()
  const { t } = useI18n()

  if (positions.length === 0) {
    return (
      <div className="card p-5 flex items-center justify-center h-40">
        <p className="text-slate-500 text-sm">{t('heatmap.noData')}</p>
      </div>
    )
  }

  const totalValue = positions.reduce((s, p) => s + (p.totalValue > 0 ? p.totalValue : p.totalCost), 0)

  // Sort by value descending
  const sorted = [...positions].sort((a, b) => {
    const av = a.totalValue > 0 ? a.totalValue : a.totalCost
    const bv = b.totalValue > 0 ? b.totalValue : b.totalCost
    return bv - av
  })

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-300 mb-3">{t('heatmap.title')}</p>
      <div className="flex flex-wrap gap-2">
        {sorted.map((pos) => {
          const value = pos.totalValue > 0 ? pos.totalValue : pos.totalCost
          const weight = totalValue > 0 ? (value / totalValue) * 100 : 0
          const useKrw = displayCurrency === 'KRW' && pos.baseCurrency === 'USD'
          const pct = useKrw ? pos.profitLossPercentKRW : pos.profitLossPercent
          const hasPrice = pos.currentPrice > 0
          const colorClass = plToColor(pct, hasPrice)

          // Size proportional to weight
          const minW = 80
          const maxW = 200
          const width = Math.max(minW, Math.min(maxW, minW + (weight / 100) * (maxW - minW) * 3))

          return (
            <div
              key={pos.ticker}
              className={`rounded-lg p-2.5 flex flex-col justify-between cursor-default transition-transform hover:scale-105 ${colorClass}`}
              style={{ width: `${width}px`, minHeight: '72px' }}
              title={`${pos.name}: ${hasPrice ? formatPercent(pct) : t('heatmap.noPrice')}`}
            >
              <div>
                <p className="font-mono text-xs font-bold truncate">{pos.ticker}</p>
                <p className="text-[10px] truncate opacity-75">{pos.name}</p>
              </div>
              <div className="mt-1">
                <p className="font-mono text-xs font-semibold">
                  {hasPrice ? formatPercent(pct) : '–'}
                </p>
                <p className="text-[10px] opacity-70 font-mono">
                  {fmtAbbrev(value, pos.baseCurrency)} · {weight.toFixed(1)}%
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-600">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600 inline-block"/> -20%↓</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-900 inline-block"/> -10%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-700 inline-block"/> 0%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-900 inline-block"/> +10%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-600 inline-block"/> +20%↑</span>
      </div>
    </div>
  )
}
