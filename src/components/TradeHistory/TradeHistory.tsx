import { useState } from 'react'
import dayjs from 'dayjs'
import type { Trade, Market, TradeType } from '../../types'
import { usePortfolioStore } from '../../store/portfolioStore'
import { formatPrice } from '../../utils/calculations'
import { TrashIcon, EditIcon } from '../Layout/Icons'
import { useI18n } from '../../hooks/useI18n'
import { useConfirm } from '../../hooks/useConfirm'
import type { TranslationKey } from '../../i18n/translations'

function TypeMeta(t: (key: TranslationKey, vars?: Record<string, string | number>) => string): Record<TradeType, { label: string; cls: string }> {
  return {
    buy:      { label: t('form.buy'),      cls: 'bg-emerald-900/60 text-emerald-300' },
    sell:     { label: t('form.sell'),     cls: 'bg-red-900/60 text-red-300' },
    dividend: { label: t('form.dividend'), cls: 'bg-amber-900/60 text-amber-300' },
    split:    { label: t('form.split'),    cls: 'bg-cyan-900/60 text-cyan-300' },
  }
}

export function TradeHistory() {
  const { trades, updateTrade, deleteTrade } = usePortfolioStore()
  const { t } = useI18n()
  const { confirmDialog, requestConfirm } = useConfirm('delete-trade')
  const [filterTicker, setFilterTicker] = useState('')
  const [filterType, setFilterType] = useState<TradeType | 'all'>('all')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const TYPE_META = TypeMeta(t)
  const TYPE_FILTER: { key: TradeType | 'all'; label: string }[] = [
    { key: 'all', label: t('history.all') },
    { key: 'buy', label: t('form.buy') },
    { key: 'sell', label: t('form.sell') },
    { key: 'dividend', label: t('form.dividend') },
    { key: 'split', label: t('form.split') },
  ]

  const sorted = [...trades].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const filtered = sorted.filter((trade) => {
    if (filterTicker && !trade.ticker.toLowerCase().includes(filterTicker.toLowerCase()) && !trade.name.toLowerCase().includes(filterTicker.toLowerCase())) return false
    if (filterType !== 'all' && trade.type !== filterType) return false
    if (filterFrom && trade.date < filterFrom) return false
    if (filterTo && trade.date > filterTo) return false
    return true
  })

  const tickers = Array.from(new Set(trades.map((trade) => trade.ticker))).sort()

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
    requestConfirm({
      title: t('confirm.deleteTitle'),
      message: t('history.confirmDelete'),
      variant: 'danger',
      onConfirm: () => deleteTrade(id),
    })
  }

  const marketBadgeClass: Record<Market, string> = {
    KRX: 'bg-blue-900/50 text-blue-300',
    US: 'bg-indigo-900/50 text-indigo-300',
    ETF: 'bg-amber-900/50 text-amber-300',
  }

  return (
    <div>
      {confirmDialog}
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
          placeholder={t('history.searchPlaceholder')}
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
            {t('history.reset')}
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
            {t('history.all')}
          </button>
          {tickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => setFilterTicker(ticker === filterTicker ? '' : ticker)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors font-mono ${
                filterTicker === ticker ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {ticker}
            </button>
          ))}
        </div>
      )}

      {/* Trade list */}
      {filtered.length === 0 ? (
        <div className="card py-16 text-center text-slate-500 text-sm">
          {trades.length === 0 ? t('history.noTrades') : t('history.noResults')}
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
                          <span>{t('history.splitRatio', { r: trade.quantity })}</span>
                        ) : trade.type === 'dividend' ? (
                          <span>{t('history.dividendLabel')} {formatPrice(trade.price, trade.market)}</span>
                        ) : (
                          <>
                            <span>{formatPrice(trade.price, trade.market)} × {trade.quantity.toLocaleString()}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-slate-300">{formatPrice(total, trade.market)}</span>
                            {trade.commission != null && trade.commission > 0 && (
                              <span className="text-slate-600">fee: {formatPrice(trade.commission, trade.market)}</span>
                            )}
                          </>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        {dayjs(trade.date).format('YYYY.MM.DD')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEditNote(trade)}
                      className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded transition-colors"
                      title={t('detail.memo')}
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDelete(trade.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
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
                      placeholder={t('history.tradeMemo')}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => saveNote(trade.id)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors">
                        {t('history.save')}
                      </button>
                      <button onClick={() => setEditingNote(null)} className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 rounded transition-colors">
                        {t('history.cancel')}
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
