import { useMemo, useState } from 'react'
import { usePortfolio } from '../hooks/usePortfolio'
import { useStockPrice } from '../hooks/useStockPrice'
import { SummaryCards } from '../components/Dashboard/SummaryCards'
import { PositionTable } from '../components/Dashboard/PositionTable'
import { DonutChart } from '../components/Dashboard/DonutChart'
import { PositionDetail } from '../components/Dashboard/PositionDetail'
import { PortfolioChart } from '../components/Dashboard/PortfolioChart'
import type { Position } from '../types'

export function DashboardPage() {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const rawPortfolio = usePortfolio()

  const priceItems = useMemo(
    () => rawPortfolio.positions.map((p) => ({ ticker: p.ticker, market: p.market })),
    [rawPortfolio.positions]
  )

  const { prices, loading, refresh } = useStockPrice(priceItems)
  const { positions, summary } = usePortfolio(prices)

  // Keep selected position in sync with latest prices
  const liveSelected = selectedPosition
    ? (positions.find((p) => p.ticker === selectedPosition.ticker) ?? null)
    : null

  return (
    <div className="space-y-5">
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

      <PositionDetail
        position={liveSelected}
        onClose={() => setSelectedPosition(null)}
      />
    </div>
  )
}
