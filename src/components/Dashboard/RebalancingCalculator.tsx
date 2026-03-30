import { useState, useMemo } from 'react'
import type { Position } from '../../types'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useCurrency } from '../../hooks/useCurrency'
import { useI18n } from '../../hooks/useI18n'

interface Props {
  positions: Position[]
}

interface RebalanceRow {
  ticker: string
  currentWeight: number
  targetWeight: number
  diff: number
  action: 'buy' | 'sell' | 'hold'
  amount: number
}

export function RebalancingCalculator({ positions }: Props) {
  const targetAllocation = usePortfolioStore((s) => s.targetAllocation)
  const setTargetAllocation = usePortfolioStore((s) => s.setTargetAllocation)
  const { fmtAmount } = useCurrency()
  const { t } = useI18n()

  const displayCurrency = usePortfolioStore((s) => s.displayCurrency)
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate)
  const [editingTicker, setEditingTicker] = useState<string | null>(null)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

  const totalValue = useMemo(
    () => positions.reduce((sum, p) => {
      const val = p.totalValue > 0 ? p.totalValue : p.totalCost
      if (displayCurrency === 'KRW') {
        return sum + (p.baseCurrency === 'USD' ? val * exchangeRate : val)
      }
      return sum + (p.baseCurrency === 'USD' ? val : val / exchangeRate)
    }, 0),
    [positions, displayCurrency, exchangeRate],
  )

  const rows = useMemo<RebalanceRow[]>(() => {
    return positions.map((p) => {
      const rawVal = p.totalValue > 0 ? p.totalValue : p.totalCost
      const currentValue = displayCurrency === 'KRW'
        ? (p.baseCurrency === 'USD' ? rawVal * exchangeRate : rawVal)
        : (p.baseCurrency === 'USD' ? rawVal : rawVal / exchangeRate)
      const currentWeight = totalValue > 0 ? (currentValue / totalValue) * 100 : 0
      const targetWeight = targetAllocation[p.ticker] ?? 0
      const diff = targetWeight - currentWeight
      const amount = Math.abs((diff / 100) * totalValue)
      const action: 'buy' | 'sell' | 'hold' =
        diff > 0.5 ? 'buy' : diff < -0.5 ? 'sell' : 'hold'
      return { ticker: p.ticker, currentWeight, targetWeight, diff, action, amount }
    })
  }, [positions, targetAllocation, totalValue, displayCurrency, exchangeRate])

  const targetSum = useMemo(() => rows.reduce((sum, r) => sum + r.targetWeight, 0), [rows])

  function handleEditStart(ticker: string, currentTarget: number) {
    setEditingTicker(ticker)
    setInputValues((prev) => ({ ...prev, [ticker]: currentTarget === 0 ? '' : String(currentTarget) }))
  }

  function handleEditCommit(ticker: string) {
    const raw = inputValues[ticker]?.trim()
    if (raw === '' || raw === undefined) {
      setTargetAllocation(ticker, null)
    } else {
      const num = parseFloat(raw)
      if (!isNaN(num) && num >= 0 && num <= 100) setTargetAllocation(ticker, num)
    }
    setEditingTicker(null)
  }

  const actionLabel = (action: 'buy' | 'sell' | 'hold') => {
    if (action === 'buy') return t('rebalance.buy')
    if (action === 'sell') return t('rebalance.sell')
    return t('rebalance.hold')
  }

  const actionColor = (action: 'buy' | 'sell' | 'hold') => {
    if (action === 'buy') return 'text-emerald-400'
    if (action === 'sell') return 'text-red-400'
    return 'text-slate-400'
  }

  if (positions.length === 0) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-slate-300 mb-2">{t('rebalance.title')}</p>
        <p className="text-slate-500 text-sm">{t('rebalance.noPositions')}</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-300 mb-4">{t('rebalance.title')}</p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-2 pr-4 text-slate-500 font-medium">{t('rebalance.ticker')}</th>
              <th className="text-right py-2 pr-4 text-slate-500 font-medium">{t('rebalance.currentPct')}</th>
              <th className="text-right py-2 pr-4 text-slate-500 font-medium">{t('rebalance.targetPct')}</th>
              <th className="text-right py-2 pr-4 text-slate-500 font-medium">{t('rebalance.action')}</th>
              <th className="text-right py-2 text-slate-500 font-medium">{t('rebalance.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ticker} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="py-2.5 pr-4 text-slate-100 font-medium font-mono">{row.ticker}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-slate-300 font-mono">
                  {row.currentWeight.toFixed(1)}%
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {editingTicker === row.ticker ? (
                    <input
                      autoFocus
                      className="input-field w-16 text-right py-1 px-2 text-xs font-mono"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={inputValues[row.ticker] ?? ''}
                      onChange={(e) => setInputValues((prev) => ({ ...prev, [row.ticker]: e.target.value }))}
                      onBlur={() => handleEditCommit(row.ticker)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditCommit(row.ticker)
                        if (e.key === 'Escape') setEditingTicker(null)
                      }}
                    />
                  ) : (
                    <button
                      className="tabular-nums text-slate-200 hover:text-white underline decoration-dashed decoration-slate-600 hover:decoration-slate-400 transition-colors cursor-pointer font-mono"
                      onClick={() => handleEditStart(row.ticker, row.targetWeight)}
                    >
                      {row.targetWeight > 0 ? `${row.targetWeight.toFixed(1)}%` : '—'}
                    </button>
                  )}
                </td>
                <td className={`py-2.5 pr-4 text-right font-medium ${actionColor(row.action)}`}>
                  {actionLabel(row.action)}
                </td>
                <td className="py-2.5 text-right tabular-nums font-mono text-slate-300">
                  {row.action !== 'hold' ? fmtAmount(row.amount, displayCurrency) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700">
              <td colSpan={2} className="py-2.5 pr-4 text-slate-500 text-xs">
                {t('rebalance.totalTarget', { n: Math.round(targetSum * 10) / 10 })}
              </td>
              <td className={`py-2.5 pr-4 text-right tabular-nums font-semibold font-mono ${Math.abs(targetSum - 100) > 0.1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {targetSum.toFixed(1)}%
              </td>
              <td colSpan={2} className="py-2.5 text-right text-xs text-amber-400">
                {Math.abs(targetSum - 100) > 0.1 && targetSum > 0 ? t('rebalance.totalWarning') : null}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
