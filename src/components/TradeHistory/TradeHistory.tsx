import { useState } from 'react'
import dayjs from 'dayjs'
import { Trade, Market } from '../../types'
import { usePortfolioStore } from '../../store/portfolioStore'
import { formatPrice } from '../../utils/calculations'
import { TrashIcon, EditIcon } from '../Layout/Icons'

export function TradeHistory() {
  const { trades, updateTrade, deleteTrade } = usePortfolioStore()
  const [filterTicker, setFilterTicker] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const sorted = [...trades].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const filtered = filterTicker
    ? sorted.filter(
        (t) =>
          t.ticker.toLowerCase().includes(filterTicker.toLowerCase()) ||
          t.name.toLowerCase().includes(filterTicker.toLowerCase())
      )
    : sorted

  const tickers = Array.from(new Set(trades.map((t) => t.ticker))).sort()

  function startEditNote(trade: Trade) {
    setEditingNote(trade.id)
    setNoteText(trade.note)
  }

  function saveNote(id: string) {
    updateTrade(id, { note: noteText })
    setEditingNote(null)
  }

  function handleDelete(id: string) {
    if (confirm('이 거래를 삭제하시겠습니까?')) {
      deleteTrade(id)
    }
  }

  const marketBadgeClass: Record<Market, string> = {
    KRX: 'bg-blue-900/50 text-blue-300',
    US: 'bg-indigo-900/50 text-indigo-300',
    ETF: 'bg-amber-900/50 text-amber-300',
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={filterTicker}
          onChange={(e) => setFilterTicker(e.target.value)}
          placeholder="종목 검색..."
          className="input-field max-w-xs"
        />
        {filterTicker && (
          <button
            onClick={() => setFilterTicker('')}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            초기화
          </button>
        )}
        <span className="text-xs text-slate-500 ml-auto">
          {filtered.length}건
        </span>
      </div>

      {/* Quick filter buttons */}
      {tickers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setFilterTicker('')}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              !filterTicker
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            전체
          </button>
          {tickers.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTicker(t === filterTicker ? '' : t)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors font-mono ${
                filterTicker === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Trade list */}
      {filtered.length === 0 ? (
        <div className="card py-16 text-center text-slate-500 text-sm">
          {trades.length === 0 ? '거래 내역이 없습니다. 거래를 입력해주세요.' : '검색 결과가 없습니다.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((trade) => {
            const isBuy = trade.type === 'buy'
            const total = trade.quantity * trade.price

            return (
              <div key={trade.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: trade info */}
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Type badge */}
                    <span
                      className={`mt-0.5 flex-shrink-0 text-xs font-bold px-2 py-1 rounded ${
                        isBuy
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-red-900/60 text-red-300'
                      }`}
                    >
                      {isBuy ? '매수' : '매도'}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-100">{trade.name}</span>
                        <span className="font-mono text-xs text-slate-500">{trade.ticker}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${marketBadgeClass[trade.market]}`}>
                          {trade.market}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-mono flex-wrap">
                        <span>{formatPrice(trade.price, trade.market)} × {trade.quantity.toLocaleString()}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-300">
                          {formatPrice(total, trade.market)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        {dayjs(trade.date).format('YYYY년 MM월 DD일')}
                      </p>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEditNote(trade)}
                      className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded transition-colors"
                      title="노트 편집"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDelete(trade.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                      title="삭제"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                {/* Note section */}
                {editingNote === trade.id ? (
                  <div className="mt-3 border-t border-slate-800 pt-3">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                      className="input-field resize-none text-xs"
                      placeholder="매매 노트..."
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => saveNote(trade.id)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingNote(null)}
                        className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 rounded transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : trade.note ? (
                  <div
                    className="mt-3 border-t border-slate-800 pt-3 cursor-pointer"
                    onClick={() => startEditNote(trade)}
                  >
                    <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">
                      {trade.note}
                    </p>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
