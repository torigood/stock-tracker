import { useState } from 'react'
import type { Position } from '../../types'
import { formatPercent, formatNumber } from '../../utils/calculations'
import { RefreshIcon } from '../Layout/Icons'
import { useCurrency } from '../../hooks/useCurrency'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useI18n } from '../../hooks/useI18n'

interface Props {
  positions: Position[]
  loading: boolean
  onRefresh: () => void
  onSelect: (position: Position) => void
}

type SortKey = 'quantity' | 'avgPrice' | 'currentPrice' | 'totalValue' | 'profitLoss' | 'profitLossPercent'

export function PositionTable({ positions, loading, onRefresh, onSelect }: Props) {
  const { fmtPrice, fmt, displayCurrency } = useCurrency()
  const targetPrices = usePortfolioStore((s) => s.targetPrices)
  const setManualPrice = usePortfolioStore((s) => s.setManualPrice)
  const manualPrices = usePortfolioStore((s) => s.manualPrices)
  const weightAlerts = usePortfolioStore((s) => s.weightAlerts)
  const { t } = useI18n()

  const [sortKey, setSortKey] = useState<SortKey>('totalValue')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editingPrice, setEditingPrice] = useState<string | null>(null) // ticker
  const [manualPriceInput, setManualPriceInput] = useState('')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function sortedPositions(): Position[] {
    return [...positions].sort((a, b) => {
      let av = 0, bv = 0
      switch (sortKey) {
        case 'quantity': av = a.quantity; bv = b.quantity; break
        case 'avgPrice': av = a.avgPrice; bv = b.avgPrice; break
        case 'currentPrice': av = a.currentPrice; bv = b.currentPrice; break
        case 'totalValue': av = a.totalValue || a.totalCost; bv = b.totalValue || b.totalCost; break
        case 'profitLoss': av = useKrwCalc(a) ? a.profitLossKRW : a.profitLoss; bv = useKrwCalc(b) ? b.profitLossKRW : b.profitLoss; break
        case 'profitLossPercent': av = useKrwCalc(a) ? a.profitLossPercentKRW : a.profitLossPercent; bv = useKrwCalc(b) ? b.profitLossPercentKRW : b.profitLossPercent; break
      }
      return sortDir === 'desc' ? bv - av : av - bv
    })
  }

  // KRW 모드 + USD 종목일 때 원화 기준 수치 사용 여부
  function useKrwCalc(pos: Position) {
    return displayCurrency === 'KRW' && pos.baseCurrency === 'USD'
  }
  function fmtKRW(n: number) {
    return (n >= 0 ? '₩' : '-₩') + Math.abs(Math.round(n)).toLocaleString('ko-KR')
  }

  function submitManualPrice(ticker: string) {
    const val = parseFloat(manualPriceInput)
    if (!isNaN(val) && val > 0) {
      setManualPrice(ticker, val)
    }
    setEditingPrice(null)
    setManualPriceInput('')
  }

  const totalPortfolioValue = positions.reduce((s, p) => s + (p.totalValue > 0 ? p.totalValue : p.totalCost), 0)

  const targetReachedCount = positions.filter((pos) => {
    const tp = targetPrices[pos.ticker]
    return tp && tp > 0 && pos.currentPrice > 0 && pos.currentPrice >= tp
  }).length

  const weightAlertCount = positions.filter((pos) => {
    const limit = weightAlerts[pos.ticker]
    if (!limit || limit <= 0 || totalPortfolioValue === 0) return false
    const value = pos.totalValue > 0 ? pos.totalValue : pos.totalCost
    const weight = (value / totalPortfolioValue) * 100
    return weight > limit
  }).length

  const sorted = sortedPositions()

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-100">{t('table.holdings')}</h2>
          {targetReachedCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded-full font-medium">
              {t('table.targetAchieved', { n: targetReachedCount })}
            </span>
          )}
          {weightAlertCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 bg-amber-900/50 text-amber-400 rounded-full font-medium">
              {t('table.weightExceeded', { n: weightAlertCount })}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
          <span>{loading ? t('table.loading') : t('table.refresh')}</span>
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          {t('table.noHoldings')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-800">
                <Th align="left">{t('table.stock')}</Th>
                <SortTh sortKey="quantity" current={sortKey} dir={sortDir} onSort={handleSort}>{t('table.quantity')}</SortTh>
                <SortTh sortKey="avgPrice" current={sortKey} dir={sortDir} onSort={handleSort}>{t('table.avgPrice')}</SortTh>
                <SortTh sortKey="currentPrice" current={sortKey} dir={sortDir} onSort={handleSort}>{t('table.currentPrice')}</SortTh>
                <SortTh sortKey="totalValue" current={sortKey} dir={sortDir} onSort={handleSort}>{t('table.value')}</SortTh>
                <SortTh sortKey="profitLoss" current={sortKey} dir={sortDir} onSort={handleSort}>{t('table.pl')}</SortTh>
                <SortTh sortKey="profitLossPercent" current={sortKey} dir={sortDir} onSort={handleSort}>{t('table.plPct')}</SortTh>
              </tr>
            </thead>
            <tbody>
              {sorted.map((pos) => {
                const krw = useKrwCalc(pos)
                const displayPL = krw ? pos.profitLossKRW : pos.profitLoss
                const displayPLPct = krw ? pos.profitLossPercentKRW : pos.profitLossPercent
                const plColor = pos.currentPrice === 0
                  ? 'text-slate-400'
                  : displayPL >= 0
                  ? 'text-emerald-400'
                  : 'text-red-400'
                const marketBadge = {
                  KRX: 'bg-blue-900/50 text-blue-300',
                  US: 'bg-indigo-900/50 text-indigo-300',
                  ETF: 'bg-amber-900/50 text-amber-300',
                }[pos.market]

                const targetPrice = targetPrices[pos.ticker]
                const hasTarget = targetPrice != null && targetPrice > 0
                const targetPct = hasTarget && pos.currentPrice > 0
                  ? (pos.currentPrice / targetPrice) * 100
                  : null
                const targetReached = targetPct != null && targetPct >= 100
                const isManual = manualPrices[pos.ticker] != null && pos.currentPrice === manualPrices[pos.ticker]

                const weightLimit = weightAlerts[pos.ticker]
                const posValue = pos.totalValue > 0 ? pos.totalValue : pos.totalCost
                const posWeight = totalPortfolioValue > 0 ? (posValue / totalPortfolioValue) * 100 : 0
                const weightExceeded = weightLimit != null && weightLimit > 0 && posWeight > weightLimit

                return (
                  <tr
                    key={pos.ticker}
                    onClick={() => onSelect(pos)}
                    className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    {/* 종목명 */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-slate-100 leading-tight">{pos.name}</p>
                            {targetReached && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/60 text-emerald-400 rounded font-medium">
                                🎯 {t('table.target')}
                              </span>
                            )}
                            {weightExceeded && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 bg-amber-900/60 text-amber-400 rounded font-medium"
                                title={`비중 ${posWeight.toFixed(1)}% — 한도 ${weightLimit}% 초과`}
                              >
                                ⚠ {posWeight.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-xs text-slate-500">{pos.ticker}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${marketBadge}`}>
                              {pos.market}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <Td>{formatNumber(pos.quantity)}</Td>
                    <Td>
                      {krw
                        ? fmtKRW(pos.avgPriceKRW)
                        : fmtPrice(pos.avgPrice, pos.market, pos.ticker)}
                    </Td>
                    <Td>
                      <div onClick={(e) => e.stopPropagation()}>
                        {editingPrice === pos.ticker ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="number"
                              value={manualPriceInput}
                              onChange={(e) => setManualPriceInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') submitManualPrice(pos.ticker); if (e.key === 'Escape') setEditingPrice(null) }}
                              placeholder="가격"
                              className="w-20 bg-surface-800 border border-indigo-500 rounded px-2 py-0.5 text-xs text-slate-200 font-mono focus:outline-none"
                            />
                            <button onClick={() => submitManualPrice(pos.ticker)} className="text-indigo-400 text-xs">✓</button>
                            <button onClick={() => setEditingPrice(null)} className="text-slate-500 text-xs">✕</button>
                          </div>
                        ) : pos.currentPrice === 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-600">–</span>
                            <button
                              onClick={() => { setEditingPrice(pos.ticker); setManualPriceInput('') }}
                              className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors"
                            >
                              {t('table.manualInput')}
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1">
                              <span>{fmtPrice(pos.currentPrice, pos.market, pos.ticker)}</span>
                              {isManual && <span className="text-[9px] text-amber-500 px-1 py-0.5 bg-amber-900/30 rounded">{t('table.manual')}</span>}
                            </div>
                            {hasTarget && pos.currentPrice > 0 && targetPct != null && (
                              <div className="mt-1">
                                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                                  <span>{fmtPrice(targetPrice, pos.market, pos.ticker)} 목표</span>
                                  <span className={targetReached ? 'text-emerald-400' : 'text-indigo-400'}>
                                    {Math.min(targetPct, 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="h-1 bg-slate-700 rounded-full overflow-hidden w-24">
                                  <div
                                    className={`h-full rounded-full transition-all ${targetReached ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${Math.min(targetPct, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      {pos.currentPrice === 0 ? <span className="text-slate-600">–</span>
                        : krw ? fmtKRW(pos.totalValueKRW)
                        : fmt(pos.totalValue, pos.market, pos.ticker)}
                    </Td>
                    <Td>
                      <span className={plColor}>
                        {pos.currentPrice === 0 ? '–'
                          : (displayPL >= 0 ? '+' : '') + (krw ? fmtKRW(displayPL) : fmt(displayPL, pos.market, pos.ticker))}
                      </span>
                    </Td>
                    <Td>
                      <span className={`font-medium ${plColor}`}>
                        {pos.currentPrice === 0 ? '–' : formatPercent(displayPLPct)}
                      </span>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-5 py-3 font-medium tracking-wide text-${align === 'left' ? 'left' : 'right'}`}>
      {children}
    </th>
  )
}

function SortTh({
  children,
  sortKey,
  current,
  dir,
  onSort,
}: {
  children: React.ReactNode
  sortKey: SortKey
  current: SortKey
  dir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}) {
  const isActive = current === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-5 py-3 font-medium tracking-wide text-right cursor-pointer hover:text-slate-300 transition-colors select-none"
    >
      <span className={isActive ? 'text-indigo-400' : ''}>{children}</span>
      {isActive && (
        <span className="ml-1 text-indigo-400">{dir === 'desc' ? '▼' : '▲'}</span>
      )}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-5 py-3.5 text-right text-slate-300 font-mono">{children}</td>
  )
}
