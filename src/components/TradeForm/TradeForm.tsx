import { useState, useRef, useEffect } from 'react'
import dayjs from 'dayjs'
import { Market, TradeType } from '../../types'
import { searchTickers, TickerEntry } from '../../data/tickerMap'
import { usePortfolioStore } from '../../store/portfolioStore'

interface Props {
  onClose?: () => void
}

export function TradeForm({ onClose }: Props) {
  const addTrade = usePortfolioStore((s) => s.addTrade)

  const [tab, setTab] = useState<TradeType>('buy')
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [market, setMarket] = useState<Market>('US')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [note, setNote] = useState('')
  const [suggestions, setSuggestions] = useState<TickerEntry[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const sugRef = useRef<HTMLDivElement>(null)

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sugRef.current && !sugRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleTickerChange(val: string) {
    setTicker(val.toUpperCase())
    const results = searchTickers(val)
    setSuggestions(results)
    setShowSuggestions(results.length > 0)
  }

  function selectSuggestion(entry: TickerEntry) {
    setTicker(entry.ticker)
    setName(entry.name)
    setMarket(entry.market)
    setShowSuggestions(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticker || !name || !quantity || !price || !date) return

    addTrade({
      ticker,
      name,
      market,
      type: tab,
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      date,
      note,
    })

    // Reset form
    setTicker('')
    setName('')
    setQuantity('')
    setPrice('')
    setNote('')
    setDate(dayjs().format('YYYY-MM-DD'))
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      onClose?.()
    }, 1200)
  }

  return (
    <div className="card p-6 max-w-lg w-full mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-slate-100">거래 입력</h2>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none">
            ×
          </button>
        )}
      </div>

      {/* Buy / Sell tabs */}
      <div className="flex gap-1 p-1 bg-surface-900 rounded-lg mb-5">
        {(['buy', 'sell'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? t === 'buy'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'buy' ? '매수' : '매도'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ticker search */}
        <div ref={sugRef} className="relative">
          <label className="label">티커 검색</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => handleTickerChange(e.target.value)}
            onFocus={() => ticker && setShowSuggestions(suggestions.length > 0)}
            placeholder="AAPL, 005930, SPY..."
            className="input-field font-mono"
            required
          />
          {showSuggestions && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-surface-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.ticker}
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700 text-left transition-colors"
                >
                  <div>
                    <span className="font-mono text-sm text-slate-200">{s.ticker}</span>
                    <span className="text-slate-400 text-xs ml-2">{s.name}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      s.market === 'KRX'
                        ? 'bg-blue-900/60 text-blue-300'
                        : s.market === 'US'
                        ? 'bg-indigo-900/60 text-indigo-300'
                        : 'bg-amber-900/60 text-amber-300'
                    }`}
                  >
                    {s.market}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Name + Market row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">종목명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="삼성전자"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">시장</label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value as Market)}
              className="input-field"
            >
              <option value="US">US (미국)</option>
              <option value="KRX">KRX (국내)</option>
              <option value="ETF">ETF</option>
            </select>
          </div>
        </div>

        {/* Qty + Price row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">수량</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="10"
              min="0.001"
              step="any"
              className="input-field font-mono"
              required
            />
          </div>
          <div>
            <label className="label">단가</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="185.50"
              min="0"
              step="any"
              className="input-field font-mono"
              required
            />
          </div>
        </div>

        {/* Total preview */}
        {quantity && price && (
          <div className="bg-surface-950 rounded-lg px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="text-slate-500">거래 금액</span>
            <span className="font-mono text-slate-200 font-medium">
              {(parseFloat(quantity) * parseFloat(price)).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="label">거래일</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
            required
          />
        </div>

        {/* Note */}
        <div>
          <label className="label">매매 노트 (선택)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="왜 매수했는지, 당시 상황, 목표가 등..."
            rows={3}
            className="input-field resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            submitted
              ? 'bg-emerald-700 text-emerald-100'
              : tab === 'buy'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          {submitted ? '✓ 입력 완료!' : tab === 'buy' ? '매수 기록' : '매도 기록'}
        </button>
      </form>
    </div>
  )
}
