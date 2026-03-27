import { useEffect } from 'react'
import dayjs from 'dayjs'
import type { Position } from '../../types'
import { formatPrice, formatCurrency, formatPercent } from '../../utils/calculations'

interface Props {
  position: Position | null
  onClose: () => void
}

export function PositionDetail({ position, onClose }: Props) {
  // ESC 키로 닫기
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // 스크롤 잠금
  useEffect(() => {
    if (position) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [position])

  if (!position) return null

  const trades = [...position.trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const plColor = position.currentPrice === 0
    ? 'text-slate-400'
    : position.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'

  const marketBadge = {
    KRX: 'bg-blue-900/50 text-blue-300',
    US: 'bg-indigo-900/50 text-indigo-300',
    ETF: 'bg-amber-900/50 text-amber-300',
  }[position.market]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-surface-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-slate-100">{position.name}</h2>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${marketBadge}`}>
                {position.market}
              </span>
            </div>
            <p className="font-mono text-sm text-slate-500">{position.ticker}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-2xl leading-none mt-0.5"
          >
            ×
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-px bg-slate-800 border-b border-slate-800 flex-shrink-0">
          <Stat label="보유수량" value={`${position.quantity.toLocaleString()}주`} />
          <Stat label="평균단가" value={formatPrice(position.avgPrice, position.market)} />
          <Stat label="현재가" value={position.currentPrice ? formatPrice(position.currentPrice, position.market) : '–'} />
          <Stat
            label="수익률"
            value={position.currentPrice ? formatPercent(position.profitLossPercent) : '–'}
            valueClass={plColor}
          />
          <Stat label="총 투자금" value={formatCurrency(position.totalCost, position.market)} />
          <Stat
            label="평가손익"
            value={position.currentPrice
              ? (position.profitLoss >= 0 ? '+' : '') + formatCurrency(position.profitLoss, position.market)
              : '–'}
            valueClass={plColor}
          />
        </div>

        {/* Trade list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              거래 내역 ({trades.length}건)
            </p>
            <div className="space-y-3">
              {trades.map((trade) => {
                const isBuy = trade.type === 'buy'
                const total = trade.quantity * trade.price
                return (
                  <div key={trade.id} className="bg-surface-800 rounded-lg p-3.5 border border-slate-800">
                    {/* Trade header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isBuy ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'
                        }`}>
                          {isBuy ? '매수' : '매도'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {dayjs(trade.date).format('YYYY.MM.DD')}
                        </span>
                      </div>
                    </div>

                    {/* Trade details */}
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono mb-2">
                      <div>
                        <p className="text-slate-600 mb-0.5">수량</p>
                        <p className="text-slate-300">{trade.quantity.toLocaleString()}주</p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-0.5">단가</p>
                        <p className="text-slate-300">{formatPrice(trade.price, trade.market)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-0.5">합계</p>
                        <p className="text-slate-300">{formatPrice(total, trade.market)}</p>
                      </div>
                    </div>

                    {/* Note */}
                    {trade.note && (
                      <div className="mt-2 pt-2 border-t border-slate-700">
                        <p className="text-[11px] text-slate-600 mb-1">메모</p>
                        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                          {trade.note}
                        </p>
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
