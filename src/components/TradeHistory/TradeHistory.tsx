import { useState } from 'react'
import dayjs from 'dayjs'
import type { Trade, Market, TradeType } from '../../types'
import { usePortfolioStore } from '../../store/portfolioStore'
import { formatPrice } from '../../utils/calculations'
import { TrashIcon, EditIcon } from '../Layout/Icons'

const TYPE_META: Record<TradeType, { label: string; cls: string }> = {
  buy: { label: '매수', cls: 'bg-emerald-900/60 text-emerald-300' },
  sell: { label: '매도', cls: 'bg-red-900/60 text-red-300' },
  dividend: { label: '배당', cls: 'bg-amber-900/60 text-amber-300' },
  split: { label: '분할', cls: 'bg-cyan-900/60 text-cyan-300' },
}

const TYPE_FILTER: { key: TradeType | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'buy', label: '매수' },
  { key: 'sell', label: '매도' },
  { key: 'dividend', label: '배당' },
  { key: 'split', label: '분할' },
]

export function TradeHistory() {
  const { trades, updateTrade, deleteTrade } = usePortfolioStore()
  const [filterTicker, setFilterTicker] = useState('')
  const [filterType, setFilterType] = useState<TradeType | 'all'>('all')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const sorted = [...trades].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const filtered = sorted.filter((t) => {
    if (filterTicker && !t.ticker.toLowerCase().includes(filterTicker.toLowerCase()) && !t.name.toLowerCase().includes(filterTicker.toLowerCase())) return false
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterFrom && t.date < filterFrom) return false
    if (filterTo && t.date > filterTo) return false
    return true
  })

  const tickers = Array.from(new Set(trades.map((t) => t.ticker))).sort()

  function clearFilters() {
    setFilterTicker('')
    setFilterType('all')
    setFilterFrom('')
    setFilterTo('')
  }

  const hasFilter = filterTicker || filterType !== 'all' || filterFrom || filterTo

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
      {/* Type filter */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TYPE_FILTER.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              filterType === f.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          type="text"
          value={filterTicker}
          onChange={(e) => setFilterTicker(e.target.value)}
          placeholder="종목 검색..."
          className="input-field max-w-xs"
        />
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="bg-surface-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          />
          <span>~</span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="bg-surface-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          />
        </div>
        {hasFilter && (
          <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-200">
            초기화
          </button>
        )}
        <span className="text-xs text-slate-500 ml-auto">{filtered.length}건</span>
      </div>

      {/* Quick ticker filter */}
      {tickers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setFilterTicker('')}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              !filterTicker ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            전체
          </button>
          {tickers.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTicker(t === filterTicker ? '' : t)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors font-mono ${
                filterTicker === t ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
            const typeMeta = TYPE_META[trade.type]
            const total = trade.quantity * trade.price

            return (
              <div key={trade.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`mt-0.5 flex-shrink-0 text-xs font-bold px-2 py-1 rounded ${typeMeta.cls}`}>
                      {typeMeta.label}
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
                        {trade.type === 'split' ? (
                          <span>분할 비율 {trade.quantity}:1</span>
                        ) : trade.type === 'dividend' ? (
                          <span>배당금 {formatPrice(trade.price, trade.market)}</span>
                        ) : (
                          <>
                            <span>{formatPrice(trade.price, trade.market)} × {trade.quantity.toLocaleString()}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-slate-300">{formatPrice(total, trade.market)}</span>
                          </>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        {dayjs(trade.date).format('YYYY년 MM월 DD일')}
                      </p>
                    </div>
                  </div>

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
                      <button onClick={() => saveNote(trade.id)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors">
                        저장
                      </button>
                      <button onClick={() => setEditingNote(null)} className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 rounded transition-colors">
                        취소
                      </button>
                    </div>
                  </div>
                ) : trade.note ? (
                  <div className="mt-3 border-t border-slate-800 pt-3 cursor-pointer" onClick={() => startEditNote(trade)}>
                    <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{trade.note}</p>
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
