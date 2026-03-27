import { useMemo } from 'react'
import { usePortfolioStore } from '../store/portfolioStore'
import { computePositions, computeSummary, applyPrices } from '../utils/calculations'

export function usePortfolio(prices?: Map<string, number>) {
  const { trades, addTrade, updateTrade, deleteTrade } = usePortfolioStore()

  const rawPositions = useMemo(() => computePositions(trades), [trades])

  const positions = useMemo(
    () => (prices ? applyPrices(rawPositions, prices) : rawPositions),
    [rawPositions, prices]
  )

  const summary = useMemo(() => computeSummary(positions), [positions])

  return { trades, positions, summary, addTrade, updateTrade, deleteTrade }
}
