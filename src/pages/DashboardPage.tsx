import { useMemo } from 'react'
import { usePortfolio } from '../hooks/usePortfolio'
import { useStockPrice } from '../hooks/useStockPrice'
import { SummaryCards } from '../components/Dashboard/SummaryCards'
import { PositionTable } from '../components/Dashboard/PositionTable'
import { DonutChart } from '../components/Dashboard/DonutChart'

export function DashboardPage() {
  const rawPortfolio = usePortfolio()

  const priceItems = useMemo(
    () => rawPortfolio.positions.map((p) => ({ ticker: p.ticker, market: p.market })),
    [rawPortfolio.positions]
  )

  const { prices, loading, refresh } = useStockPrice(priceItems)
  const { positions, summary } = usePortfolio(prices)

  return (
    <div className="space-y-5">
      <SummaryCards summary={summary} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <PositionTable positions={positions} loading={loading} onRefresh={refresh} />
        </div>
        <div>
          <DonutChart positions={positions} />
        </div>
      </div>
    </div>
  )
}
