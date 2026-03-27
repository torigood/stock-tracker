import { useMemo, useState } from 'react'
import { usePortfolio } from '../hooks/usePortfolio'
import { useStockPrice } from '../hooks/useStockPrice'
import { usePortfolioStore } from '../store/portfolioStore'
import { SummaryCards } from '../components/Dashboard/SummaryCards'
import { PositionTable } from '../components/Dashboard/PositionTable'
import { DonutChart } from '../components/Dashboard/DonutChart'
import { PositionDetail } from '../components/Dashboard/PositionDetail'
import { PortfolioChart } from '../components/Dashboard/PortfolioChart'
import { Heatmap } from '../components/Dashboard/Heatmap'
import { MonthlyPLChart } from '../components/Dashboard/MonthlyPLChart'
import { ReminderBanner } from '../components/Dashboard/ReminderBanner'
import { PinnedNotes } from '../components/Dashboard/PinnedNotes'
import type { Position } from '../types'

export function DashboardPage() {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const manualPrices = usePortfolioStore((s) => s.manualPrices)
  const rawPortfolio = usePortfolio()

  const priceItems = useMemo(
    () => rawPortfolio.positions.map((p) => ({ ticker: p.ticker, market: p.market })),
    [rawPortfolio.positions]
  )

  const { prices: fetchedPrices, loading, refresh } = useStockPrice(priceItems)

  // Merge manual prices for tickers where API returned 0 or nothing
  const prices = useMemo(() => {
    const merged = new Map(fetchedPrices)
    for (const [ticker, price] of Object.entries(manualPrices)) {
      if (!merged.get(ticker)) {
        merged.set(ticker, price)
      }
    }
    return merged
  }, [fetchedPrices, manualPrices])

  const { positions, summary } = usePortfolio(prices)

  const liveSelected = selectedPosition
    ? (positions.find((p) => p.ticker === selectedPosition.ticker) ?? null)
    : null

  return (
    <div className="space-y-5">
      <ReminderBanner />
      <PinnedNotes />
      <SummaryCards summary={summary} />
      <PortfolioChart />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <PositionTable
            positions={positions}
            loading={loading}
            onRefresh={refresh}
            onSelect={setSelectedPosition}
          />
        </div>
        <div>
          <DonutChart positions={positions} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Heatmap positions={positions} />
        <MonthlyPLChart />
      </div>

      <PositionDetail
        position={liveSelected}
        onClose={() => setSelectedPosition(null)}
      />
    </div>
  )
}
