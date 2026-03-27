import { useState, useEffect, useCallback, useRef } from 'react'
import type { Market, PriceCache } from '../types'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const globalCache = new Map<string, PriceCache>()

interface TickerMarket {
  ticker: string
  market: Market
}

function toYahooSymbol(ticker: string, market: Market): string {
  if (market === 'KRX') return `${ticker}.KS`
  // Korean ETFs (numeric tickers) need .KS suffix
  if (market === 'ETF' && /^\d+$/.test(ticker)) return `${ticker}.KS`
  return ticker
}

async function fetchPrice(ticker: string, market: Market): Promise<number> {
  const symbol = toYahooSymbol(ticker, market)
  const url = `/api/yahoo?symbol=${encodeURIComponent(symbol)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice
  if (typeof price !== 'number') throw new Error('No price in response')
  return price
}

export function useStockPrice(items: TickerMarket[]) {
  const [prices, setPrices] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Map<string, string>>(new Map())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadPrices = useCallback(async () => {
    if (items.length === 0) return
    setLoading(true)

    const now = Date.now()
    const result = new Map<string, number>()
    const newErrors = new Map<string, string>()

    // Seed result from cache
    for (const { ticker } of items) {
      const cached = globalCache.get(ticker)
      if (cached && now - cached.timestamp < CACHE_TTL) {
        result.set(ticker, cached.price)
      }
    }

    const toFetch = items.filter(({ ticker }) => !result.has(ticker))

    await Promise.allSettled(
      toFetch.map(async ({ ticker, market }) => {
        try {
          const price = await fetchPrice(ticker, market)
          globalCache.set(ticker, { price, timestamp: now })
          result.set(ticker, price)
        } catch (e) {
          newErrors.set(ticker, (e as Error).message)
        }
      })
    )

    setPrices(new Map(result))
    setErrors(newErrors)
    setLoading(false)
  }, [items.map((i) => i.ticker).join(',')])  // eslint-disable-line

  useEffect(() => {
    loadPrices()
    intervalRef.current = setInterval(loadPrices, CACHE_TTL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadPrices])

  return { prices, loading, errors, refresh: loadPrices }
}
