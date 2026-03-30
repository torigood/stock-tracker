import { useMemo } from 'react'
import { usePortfolioStore } from '../store/portfolioStore'
import {
  computePositions,
  computeSummary,
  applyPrices,
  computeRealizedPL,
  convertToDisplay,
} from '../utils/calculations'

export function usePortfolio(prices?: Map<string, number>) {
  const { trades, addTrade, updateTrade, deleteTrade } = usePortfolioStore()
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency)
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate)
  const costBasisMethod = usePortfolioStore((s) => s.costBasisMethod)

  // Pass exchange rate for KRW cost basis calculation
  const rawPositions = useMemo(
    () => computePositions(trades, exchangeRate, costBasisMethod),
    [trades, exchangeRate, costBasisMethod]
  )

  // Pass current exchange rate for KRW value calculation
  const positions = useMemo(
    () => prices ? applyPrices(rawPositions, prices, exchangeRate) : rawPositions,
    [rawPositions, prices, exchangeRate]
  )

  const totalRealizedPL = useMemo(() => {
    const records = computeRealizedPL(trades, costBasisMethod)
    return records.reduce((sum, r) => {
      return sum + convertToDisplay(r.realizedPL, r.baseCurrency, displayCurrency, exchangeRate)
    }, 0)
  }, [trades, displayCurrency, exchangeRate, costBasisMethod])

  // Summary is now currency-aware (correctly converts mixed portfolios)
  const summary = useMemo(
    () => computeSummary(positions, displayCurrency, exchangeRate, totalRealizedPL),
    [positions, displayCurrency, exchangeRate, totalRealizedPL]
  )

  return { trades, positions, summary, addTrade, updateTrade, deleteTrade }
}
