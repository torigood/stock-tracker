import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import type { Position, TradeType } from '../../types'
import { formatPercent, computeRealizedPL } from '../../utils/calculations'
import { useCurrency } from '../../hooks/useCurrency'
import { usePortfolioStore } from '../../store/portfolioStore'

interface Props {
  position: Position | null
  onClose: () => void
}

const TRADE_TYPE_META: Record<TradeType, { label: string; cls: string }> = {
  buy: { label: '매수', cls: 'bg-emerald-900/60 text-emerald-300' },
  sell: { label: '매도', cls: 'bg-red-900/60 text-red-300' },
  dividend: { label: '배당', cls: 'bg-amber-900/60 text-amber-300' },
  split: { label: '분할', cls: 'bg-cyan-900/60 text-cyan-300' },
}

export function PositionDetail({ position, onClose }: Props) {
  const { fmtPrice, fmt, displayCurrency } = useCurrency()
  const targetPrices = usePortfolioStore((s) => s.targetPrices)
  const setTargetPrice = usePortfolioStore((s) => s.setTargetPrice)
  const sectors = usePortfolioStore((s) => s.sectors)
  const setSector = usePortfolioStore((s) => s.setSector)

  const [targetInput, setTargetInput] = useState('')
  const [sectorInput, setSectorInput] = useState('')
  const [editingSector, setEditingSector] = useState(false)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (position) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [position])

  useEffect(() => {
    if (position) {
      const existing = targetPrices[position.ticker]
      setTargetInput(existing != null ? String(existing) : '')
      setSectorInput(sectors[position.ticker] ?? '')
      setEditingSector(false)
    }
  }, [position, targetPrices, sectors])

  if (!position) return null

  const trades = [...position.trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const useKrw = displayCurrency === 'KRW' && position.baseCurrency === 'USD'
  const displayPL = useKrw ? position.profitLossKRW : position.profitLoss
  const displayPLPct = useKrw ? position.profitLossPercentKRW : position.profitLossPercent
  const displayAvgPrice = useKrw
    ? (position.avgPriceKRW >= 0 ? '₩' : '-₩') + Math.abs(Math.round(position.avgPriceKRW)).toLocaleString('ko-KR')
    : fmtPrice(position.avgPrice, position.market, position.ticker)
  const displayTotalCost = useKrw
    ? (position.totalCostKRW >= 0 ? '₩' : '-₩') + Math.abs(Math.round(position.totalCostKRW)).toLocaleString('ko-KR')
    : fmt(position.totalCost, position.market, position.ticker)
  const displayTotalValue = useKrw && position.totalValueKRW > 0
    ? (position.totalValueKRW >= 0 ? '₩' : '-₩') + Math.abs(Math.round(position.totalValueKRW)).toLocaleString('ko-KR')
    : fmt(position.totalValue, position.market, position.ticker)

  const plColor = position.currentPrice === 0
    ? 'text-slate-400'
    : displayPL >= 0 ? 'text-emerald-400' : 'text-red-400'

  const marketBadge = {
    KRX: 'bg-blue-900/50 text-blue-300',
    US: 'bg-indigo-900/50 text-indigo-300',
    ETF: 'bg-amber-900/50 text-amber-300',
  }[position.market]

  const realizedRecords = computeRealizedPL(position.trades)
  const realizedRecord = realizedRecords.find((r) => r.ticker === position.ticker)
  const hasRealized = realizedRecord != null

  const targetPrice = targetPrices[position.ticker]
  const hasTarget = targetPrice != null && targetPrice > 0
  const targetPct = hasTarget && position.currentPrice > 0
    ? (position.currentPrice / targetPrice) * 100
    : null
  const targetReached = targetPct != null && targetPct >= 100

  const currentSector = sectors[position.ticker]

  function handleSetTarget() {
    const val = parseFloat(targetInput)
    if (!isNaN(val) && val > 0) {
      setTargetPrice(position!.ticker, val)
    }
  }

  function handleDeleteTarget() {
    setTargetPrice(position!.ticker, null)
    setTargetInput('')
  }

  function handleSaveSector() {
    if (sectorInput.trim()) {
      setSector(position!.ticker, sectorInput.trim())
    }
    setEditingSector(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-surface-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-slate-100">{position.name}</h2>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${marketBadge}`}>
                {position.market}
              </span>
              {currentSector && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300 font-medium">
                  {currentSector}
                </span>
              )}
            </div>
            <p className="font-mono text-sm text-slate-500">{position.ticker}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl leading-none mt-0.5">
            ×
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-px bg-slate-800 border-b border-slate-800 flex-shrink-0">
          <Stat label="보유수량" value={`${position.quantity.toLocaleString()}주`} />
          <Stat label="평균단가" value={displayAvgPrice} />
          <Stat label="현재가" value={position.currentPrice ? fmtPrice(position.currentPrice, position.market, position.ticker) : '–'} />
          <Stat
            label={`수익률${useKrw ? ' (원화)' : ''}`}
            value={position.currentPrice ? formatPercent(displayPLPct) : '–'}
            valueClass={plColor}
          />
          <Stat label="총 투자금" value={displayTotalCost} />
          <Stat
            label="평가손익"
            value={position.currentPrice
              ? (displayPL >= 0 ? '+' : '') + (useKrw
                  ? (displayPL >= 0 ? '₩' : '-₩') + Math.abs(Math.round(displayPL)).toLocaleString('ko-KR')
                  : fmt(displayPL, position.market, position.ticker))
              : '–'}
            valueClass={plColor}
          />
          {position.currentPrice > 0 && (
            <Stat label="평가금액" value={displayTotalValue} />
          )}
          {position.dividendTotal > 0 && (
            <Stat
              label="배당 수령액"
              value={('+' + fmt(position.dividendTotal, position.market, position.ticker))}
              valueClass="text-amber-400"
            />
          )}
          {hasRealized && realizedRecord && (
            <Stat
              label="실현 손익"
              value={(realizedRecord.realizedPL >= 0 ? '+' : '') + fmt(realizedRecord.realizedPL, position.market, position.ticker)}
              valueClass={realizedRecord.realizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}
            />
          )}
        </div>

        {/* Target price section */}
        <div className="px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">목표가 설정</p>
          {hasTarget && targetPct != null && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>현재 목표가: {fmtPrice(targetPrice, position.market, position.ticker)}</span>
                <span className={targetReached ? 'text-emerald-400 font-medium' : 'text-indigo-400'}>
                  {Math.min(targetPct, 100).toFixed(1)}% {targetReached ? '✓ 도달' : ''}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${targetReached ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(targetPct, 100)}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder={`목표가 (${position.baseCurrency === 'KRW' ? '₩' : '$'})`}
              className="flex-1 bg-surface-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <button onClick={handleSetTarget} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors">
              설정
            </button>
            {hasTarget && (
              <button onClick={handleDeleteTarget} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors">
                삭제
              </button>
            )}
          </div>
        </div>

        {/* Sector section */}
        <div className="px-5 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">섹터 분류</p>
            {currentSector && !editingSector && (
              <button onClick={() => { setEditingSector(true); setSectorInput(currentSector) }} className="text-xs text-slate-500 hover:text-slate-300">
                수정
              </button>
            )}
          </div>
          {editingSector ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                autoFocus
                type="text"
                value={sectorInput}
                onChange={(e) => setSectorInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSector(); if (e.key === 'Escape') setEditingSector(false) }}
                placeholder="예: 기술주, 배당주, ETF..."
                className="flex-1 bg-surface-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button onClick={handleSaveSector} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors">
                저장
              </button>
              <button onClick={() => setEditingSector(false)} className="px-2 py-1.5 text-slate-400 text-xs">취소</button>
            </div>
          ) : currentSector ? (
            <p className="text-xs text-violet-300 mt-1">{currentSector}</p>
          ) : (
            <button
              onClick={() => setEditingSector(true)}
              className="text-xs text-slate-600 hover:text-slate-400 mt-1 transition-colors"
            >
              + 섹터 추가 (도넛 차트에서 섹터별 보기에 사용)
            </button>
          )}
        </div>

        {/* Trade list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              거래 내역 ({trades.length}건)
            </p>
            <div className="space-y-3">
              {trades.map((trade) => {
                const typeMeta = TRADE_TYPE_META[trade.type]
                const total = trade.quantity * trade.price
                return (
                  <div key={trade.id} className="bg-surface-800 rounded-lg p-3.5 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${typeMeta.cls}`}>
                          {typeMeta.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {dayjs(trade.date).format('YYYY.MM.DD')}
                        </span>
                      </div>
                    </div>

                    {trade.type === 'split' ? (
                      <p className="text-xs font-mono text-slate-300">분할 비율 {trade.quantity}:1</p>
                    ) : trade.type === 'dividend' ? (
                      <p className="text-xs font-mono text-amber-300">배당금 {fmtPrice(trade.price, trade.market, trade.ticker)}</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono mb-2">
                        <div>
                          <p className="text-slate-600 mb-0.5">수량</p>
                          <p className="text-slate-300">{trade.quantity.toLocaleString()}주</p>
                        </div>
                        <div>
                          <p className="text-slate-600 mb-0.5">단가</p>
                          <p className="text-slate-300">{fmtPrice(trade.price, trade.market, trade.ticker)}</p>
                        </div>
                        <div>
                          <p className="text-slate-600 mb-0.5">합계</p>
                          <p className="text-slate-300">{fmt(total, trade.market, trade.ticker)}</p>
                        </div>
                      </div>
                    )}

                    {trade.note && (
                      <div className="mt-2 pt-2 border-t border-slate-700">
                        <p className="text-[11px] text-slate-600 mb-1">메모</p>
                        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{trade.note}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Stat({
  label,
  value,
  valueClass = 'text-slate-200',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="bg-surface-900 px-4 py-3">
      <p className="text-[11px] text-slate-600 mb-0.5 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-mono font-medium ${valueClass}`}>{value}</p>
    </div>
  )
}
