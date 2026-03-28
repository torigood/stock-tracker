import { useState, useRef, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import type { Market, TradeType, TickerEntry } from '../../types'
import { searchTickers } from '../../data/tickerMap'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useI18n } from '../../hooks/useI18n'

interface Props {
  onClose?: () => void
}

function toYahooSymbol(ticker: string, market: Market) {
  if (market === 'KRX') return `${ticker}.KS`
  if (market === 'ETF' && /^\d+$/.test(ticker)) return `${ticker}.KS`
  return ticker
}

async function yahooFetch(symbol: string, period1?: number, period2?: number): Promise<number | null> {
  const params = period1 && period2
    ? `symbol=${encodeURIComponent(symbol)}&period1=${period1}&period2=${period2}`
    : `symbol=${encodeURIComponent(symbol)}`
  const res = await fetch(`/api/yahoo?${params}`)
  const json = await res.json()
  const closes: number[] | undefined = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close
  const close = closes?.filter((v: number) => v != null).at(-1)
  const spot: number | undefined = json?.chart?.result?.[0]?.meta?.regularMarketPrice
  const price = close ?? spot
  return typeof price === 'number' ? price : null
}

const TAB_ACTIVE_CLASS: Record<TradeType, string> = {
  buy: 'bg-emerald-600 text-white',
  sell: 'bg-red-600 text-white',
  dividend: 'bg-amber-600 text-white',
  split: 'bg-cyan-600 text-white',
}

export function TradeForm({ onClose }: Props) {
  const addTrade = usePortfolioStore((s) => s.addTrade)
  const storeExchangeRate = usePortfolioStore((s) => s.exchangeRate)
  const { t } = useI18n()

  const [tab, setTab] = useState<TradeType>('buy')
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [market, setMarket] = useState<Market>('US')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [lastEdited, setLastEdited] = useState<'qty' | 'amount'>('qty')
  const [priceUnit, setPriceUnit] = useState<'usd' | 'krw'>('usd')
  const [exchangeRate, setExchangeRate] = useState(storeExchangeRate)
  const [purchaseRate, setPurchaseRate] = useState(String(storeExchangeRate))
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [note, setNote] = useState('')
  const [commission, setCommission] = useState('')
  const [suggestions, setSuggestions] = useState<TickerEntry[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [priceError, setPriceError] = useState('')
  const [fetchingRate, setFetchingRate] = useState(false)

  const sugRef = useRef<HTMLDivElement>(null)

  // Sync from store when it updates
  useEffect(() => {
    setExchangeRate(storeExchangeRate)
  }, [storeExchangeRate])

  // Fetch historical USD/KRW rate when date changes (USD trades only)
  useEffect(() => {
    const isUsd = market === 'US' || (market === 'ETF' && !/^\d+$/.test(ticker || 'X'))
    if (!isUsd) return

    const isToday = date === dayjs().format('YYYY-MM-DD')
    if (isToday) {
      setPurchaseRate(String(storeExchangeRate))
      return
    }

    setFetchingRate(true)
    fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.min.json`)
      .then((r) => r.json())
      .then((data: unknown) => {
        const krw = data && typeof data === 'object' && 'usd' in data
          ? (data as { usd: Record<string, number> }).usd?.krw
          : null
        if (krw && krw > 100) setPurchaseRate(String(Math.round(krw)))
      })
      .catch(() => {})
      .finally(() => setFetchingRate(false))
  }, [date, market, ticker, storeExchangeRate])

  // Reset priceUnit when market changes
  useEffect(() => {
    setPriceUnit(market === 'KRX' ? 'krw' : 'usd')
  }, [market])

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

  const fetchCurrentPrice = useCallback(async () => {
    if (!ticker) return
    setFetchingPrice(true)
    setPriceError('')
    try {
      const symbol = toYahooSymbol(ticker, market)
      const isToday = date === dayjs().format('YYYY-MM-DD')
      let fetchedPrice: number | null
      if (isToday) {
        fetchedPrice = await yahooFetch(symbol)
      } else {
        const d = dayjs(date)
        const period1 = d.unix()
        const period2 = d.add(2, 'day').unix()
        fetchedPrice = await yahooFetch(symbol, period1, period2)
      }
      if (fetchedPrice === null) {
        setPriceError('시세를 찾을 수 없습니다 (공휴일/주말 확인)')
        return
      }
      const displayPrice = priceUnit === 'krw' && market === 'US'
        ? Math.round(fetchedPrice * exchangeRate)
        : fetchedPrice
      setPrice(String(displayPrice))
    } catch {
      setPriceError('조회 실패. 다시 시도해주세요.')
    } finally {
      setFetchingPrice(false)
    }
  }, [ticker, market, date, priceUnit, exchangeRate])

  function handleQtyChange(val: string) {
    setQuantity(val)
    setLastEdited('qty')
    const q = parseFloat(val)
    const p = parseFloat(price)
    if (!isNaN(q) && !isNaN(p) && p > 0) {
      setTotalAmount(priceUnit === 'krw' ? String(Math.round(q * p)) : (q * p).toFixed(4))
    } else {
      setTotalAmount('')
    }
  }

  function handleAmountChange(val: string) {
    setTotalAmount(val)
    setLastEdited('amount')
    const amt = parseFloat(val)
    const p = parseFloat(price)
    if (!isNaN(amt) && !isNaN(p) && p > 0) {
      setQuantity((amt / p).toFixed(6))
    } else {
      setQuantity('')
    }
  }

  function getNativePrice(): number {
    const p = parseFloat(price)
    if (isNaN(p)) return 0
    if (market === 'US' && priceUnit === 'krw') return p / exchangeRate
    return p
  }

  function getFinalQty(): number {
    return parseFloat(quantity) || 0
  }

  function resetForm() {
    setTicker('')
    setName('')
    setQuantity('')
    setPrice('')
    setTotalAmount('')
    setNote('')
    setCommission('')
    setDate(dayjs().format('YYYY-MM-DD'))
    setPriceError('')
    setLastEdited('qty')
    setPurchaseRate(String(storeExchangeRate))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (tab === 'split') {
      const ratio = parseFloat(quantity)
      if (!ticker || !name || !ratio || ratio <= 1 || !date) return
      addTrade({ ticker, name, market, type: 'split', quantity: ratio, price: 0, date, note, exchangeRateAtPurchase: undefined })
    } else if (tab === 'dividend') {
      const divAmount = parseFloat(price)
      if (!ticker || !name || !divAmount || !date) return
      addTrade({ ticker, name, market, type: 'dividend', quantity: 1, price: divAmount, date, note, exchangeRateAtPurchase: undefined })
    } else {
      // buy or sell
      const finalQty = getFinalQty()
      const nativePrice = getNativePrice()
      if (!ticker || !name || !finalQty || !nativePrice || !date) return

      const isUsdTrade = market === 'US' || (market === 'ETF' && !/^\d+$/.test(ticker))
      const rateAtPurchase = isUsdTrade ? parseFloat(purchaseRate) || storeExchangeRate : undefined
      const commissionVal = parseFloat(commission) || undefined

      addTrade({ ticker, name, market, type: tab, quantity: finalQty, price: nativePrice, date, note, exchangeRateAtPurchase: rateAtPurchase, commission: commissionVal })
    }

    resetForm()
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      onClose?.()
    }, 1200)
  }

  const isBuySell = tab === 'buy' || tab === 'sell'
  const showUnitToggle = market === 'US' && isBuySell
  const unitLabel = priceUnit === 'usd' ? 'USD' : 'KRW'
  const altPrice = (() => {
    const p = parseFloat(price)
    if (!p || !showUnitToggle) return null
    if (priceUnit === 'usd') return `≈ ₩${Math.round(p * exchangeRate).toLocaleString('ko-KR')}`
    return `≈ $${(p / exchangeRate).toFixed(2)}`
  })()

  const totalPreview = (() => {
    if (!isBuySell) return null
    const p = parseFloat(price)
    const qty = getFinalQty()
    if (!p || !qty) return null
    const total = p * qty
    return priceUnit === 'krw'
      ? `₩${Math.round(total).toLocaleString('ko-KR')}`
      : `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  })()

  const tabLabels: Record<TradeType, string> = {
    buy: t('form.buy'), sell: t('form.sell'), dividend: t('form.dividend'), split: t('form.split'),
  }
  const submitLabels: Record<TradeType, string> = {
    buy: t('form.submitBuy'), sell: t('form.submitSell'), dividend: t('form.submitDividend'), split: t('form.submitSplit'),
  }
  const submitLabel = submitted ? t('form.submitted') : submitLabels[tab]
  const submitClass = submitted
    ? 'bg-emerald-700 text-emerald-100'
    : tab === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
    : tab === 'sell' ? 'bg-red-600 hover:bg-red-500 text-white'
    : tab === 'dividend' ? 'bg-amber-600 hover:bg-amber-500 text-white'
    : 'bg-cyan-600 hover:bg-cyan-500 text-white'

  return (
    <div className="card p-6 max-w-lg w-full mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-slate-100">{t('form.title')}</h2>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none">
            ×
          </button>
        )}
      </div>

      {/* Trade type tabs */}
      <div className="flex gap-1 p-1 bg-surface-900 rounded-lg mb-5">
        {(Object.keys(TAB_ACTIVE_CLASS) as TradeType[]).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === tabKey ? TAB_ACTIVE_CLASS[tabKey] : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tabLabels[tabKey]}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Ticker search */}
        <div ref={sugRef} className="relative">
          <label className="label">{t('form.tickerSearch')}</label>
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
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    s.market === 'KRX' ? 'bg-blue-900/60 text-blue-300'
                    : s.market === 'US' ? 'bg-indigo-900/60 text-indigo-300'
                    : 'bg-amber-900/60 text-amber-300'
                  }`}>
                    {s.market}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Name + Market */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('form.stockName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Samsung"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">{t('form.market')}</label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value as Market)}
              className="input-field"
            >
              <option value="US">{t('form.marketUS')}</option>
              <option value="KRX">{t('form.marketKRX')}</option>
              <option value="ETF">{t('form.marketETF')}</option>
            </select>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="label">{t('form.tradeDate')}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
            required
          />
        </div>

        {/* ── Split: ratio only ─────────────────────────────────────── */}
        {tab === 'split' && (
          <div>
            <label className="label">{t('form.splitRatio')}</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={t('form.splitRatioHint')}
              min="1.01"
              step="any"
              className="input-field font-mono"
              required
            />
            <p className="text-xs text-slate-500 mt-1">{t('form.splitRatioHelp')}</p>
          </div>
        )}

        {/* ── Dividend: amount only ─────────────────────────────────── */}
        {tab === 'dividend' && (
          <div>
            <label className="label">{t('form.dividendTotal')}</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={market === 'KRX' ? '50000' : '12.50'}
              min="0"
              step="any"
              className="input-field font-mono"
              required
            />
            <p className="text-xs text-slate-500 mt-1">{t('form.dividendHelp')}</p>
          </div>
        )}

        {/* ── Buy/Sell fields ───────────────────────────────────────── */}
        {isBuySell && (
          <>
            {/* Price */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <label className="label !mb-0">{t('form.pricePerShare')}</label>
                  {showUnitToggle && (
                    <button
                      type="button"
                      onClick={() => {
                        const p = parseFloat(price)
                        if (p) {
                          const converted = priceUnit === 'usd'
                            ? Math.round(p * exchangeRate)
                            : parseFloat((p / exchangeRate).toFixed(4))
                          setPrice(String(converted))
                        }
                        setPriceUnit((u) => u === 'usd' ? 'krw' : 'usd')
                      }}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors font-mono"
                    >
                      {unitLabel} ⇄
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={fetchCurrentPrice}
                  disabled={!ticker || fetchingPrice}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {fetchingPrice ? t('form.fetching') : (date === dayjs().format('YYYY-MM-DD') ? t('form.fetchPrice') : t('form.fetchHistoricalPrice'))}
                </button>
              </div>
              <input
                type="number"
                value={price}
                onChange={(e) => { setPrice(e.target.value); setPriceError('') }}
                placeholder={priceUnit === 'krw' ? '150000' : '183.50'}
                min="0"
                step="any"
                className="input-field font-mono"
                required
              />
              {altPrice && (
                <p className="text-xs text-slate-500 mt-1 font-mono">{altPrice}
                  <span className="text-slate-600 ml-1">(1 USD = ₩{exchangeRate.toLocaleString()})</span>
                </p>
              )}
              {priceError && <p className="text-xs text-red-400 mt-1">{priceError.includes('찾을') ? t('form.priceNotFound') : priceError.includes('실패') ? t('form.fetchFailed') : priceError}</p>}
            </div>

            {/* Qty + Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">
                  {t('form.shares')}{lastEdited === 'amount' && quantity && <span className="text-indigo-400 ml-1">{t('form.autoLabel')}</span>}
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => handleQtyChange(e.target.value)}
                  placeholder="10"
                  min="0.000001"
                  step="any"
                  className="input-field font-mono"
                  required
                />
              </div>
              <div>
                <label className="label">
                  {t('form.totalAmount')} ({unitLabel}){lastEdited === 'qty' && totalAmount && <span className="text-indigo-400 ml-1">{t('form.autoLabel')}</span>}
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder={priceUnit === 'krw' ? '10000' : '100'}
                  min="0"
                  step="any"
                  className="input-field font-mono"
                />
              </div>
            </div>

            {/* Total preview */}
            {totalPreview && (
              <div className="bg-surface-950 rounded-lg px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-slate-500">{t('form.tradeAmount')}</span>
                <span className="font-mono text-slate-200 font-medium">{totalPreview}</span>
              </div>
            )}

            {/* Purchase exchange rate — USD trades only */}
            {(market === 'US' || (market === 'ETF' && !/^\d+$/.test(ticker))) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">{t('form.purchaseRate')}</label>
                  {fetchingRate && <span className="text-[11px] text-slate-500">{t('form.fetchingRate')}</span>}
                </div>
                <input
                  type="number"
                  value={purchaseRate}
                  onChange={(e) => setPurchaseRate(e.target.value)}
                  placeholder="1380"
                  min="1"
                  step="1"
                  className="input-field font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">{t('form.rateHelp')}</p>
              </div>
            )}
          </>
        )}

        {/* Note */}
        <div>
          <label className="label">{t('form.note')}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              tab === 'dividend' ? t('form.notePlaceholderDividend')
              : tab === 'split' ? t('form.notePlaceholderSplit')
              : tab === 'sell' ? t('form.notePlaceholderSell')
              : t('form.notePlaceholderBuy')
            }
            rows={2}
            className="input-field resize-none"
          />

          {/* Commission (buy/sell only) */}
          {isBuySell && (
            <div>
              <label className="label">{t('form.commission')}</label>
              <input
                type="number"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="0"
                min="0"
                step="any"
                className="input-field font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">{t('form.commissionHelp')}</p>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${submitClass}`}
        >
          {submitLabel}
        </button>
      </form>
    </div>
  )
}
