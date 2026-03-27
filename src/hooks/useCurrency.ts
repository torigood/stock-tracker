import { usePortfolioStore } from '../store/portfolioStore'
import { getBaseCurrency, convertToDisplay } from '../utils/calculations'
import type { Market } from '../types'

export function useCurrency() {
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency)
  const setDisplayCurrency = usePortfolioStore((s) => s.setDisplayCurrency)
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate)
  const exchangeRateOverride = usePortfolioStore((s) => s.exchangeRateOverride)

  // Effective rate: manual override takes precedence
  const effectiveRate = exchangeRateOverride ?? exchangeRate

  const symbol = displayCurrency === 'KRW' ? '₩' : '$'

  function fmtAmount(amount: number, inCurrency: 'KRW' | 'USD'): string {
    const converted = convertToDisplay(amount, inCurrency, displayCurrency, effectiveRate)
    const abs = Math.abs(converted)
    const sign = converted < 0 ? '-' : ''
    if (displayCurrency === 'KRW') {
      return sign + '₩' + Math.round(abs).toLocaleString('ko-KR')
    }
    return (
      (converted < 0 ? '-$' : '$') +
      abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
  }

  function fmtPrice(price: number, inCurrency: 'KRW' | 'USD'): string {
    if (price === 0) return '–'
    const converted = convertToDisplay(price, inCurrency, displayCurrency, effectiveRate)
    const abs = Math.abs(converted)
    if (displayCurrency === 'KRW') {
      return '₩' + Math.round(abs).toLocaleString('ko-KR')
    }
    return (
      '$' +
      abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
  }

  /** Format an amount that comes from a position's native currency (derived from market + ticker) */
  function fmt(amount: number, market: Market, ticker?: string): string {
    const base = getBaseCurrency(market, ticker ?? '')
    return fmtAmount(amount, base)
  }

  /** Format a price that comes from a position's native currency */
  function fmtPriceFor(price: number, market: Market, ticker?: string): string {
    const base = getBaseCurrency(market, ticker ?? '')
    return fmtPrice(price, base)
  }

  /** Abbreviated format for large numbers (K, M) */
  function fmtAbbrev(amount: number, inCurrency: 'KRW' | 'USD'): string {
    const converted = convertToDisplay(amount, inCurrency, displayCurrency, effectiveRate)
    const abs = Math.abs(converted)
    const sign = converted < 0 ? '-' : ''
    let str: string
    if (displayCurrency === 'KRW') {
      if (abs >= 1_000_000_000) {
        str = (abs / 1_000_000_000).toFixed(2) + 'B'
      } else if (abs >= 1_000_000) {
        str = (abs / 1_000_000).toFixed(1) + 'M'
      } else if (abs >= 1_000) {
        str = Math.round(abs).toLocaleString('ko-KR')
      } else {
        str = abs.toFixed(0)
      }
      return sign + '₩' + str
    } else {
      if (abs >= 1_000_000) {
        str = (abs / 1_000_000).toFixed(2) + 'M'
      } else if (abs >= 1_000) {
        str = (abs / 1_000).toFixed(1) + 'K'
      } else {
        str = abs.toFixed(2)
      }
      return (converted < 0 ? '-$' : '$') + str
    }
  }

  return {
    displayCurrency,
    setDisplayCurrency,
    exchangeRate: effectiveRate,
    rawExchangeRate: exchangeRate,
    symbol,
    fmt,
    fmtPrice: fmtPriceFor,
    fmtAmount,
    fmtAbbrev,
    getBaseCurrencyFor: (market: Market, ticker?: string) =>
      getBaseCurrency(market, ticker ?? ''),
  }
}
