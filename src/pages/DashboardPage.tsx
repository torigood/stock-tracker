import { useMemo, useState } from 'react'
import { usePortfolio } from '../hooks/usePortfolio'
import { useStockPrice } from '../hooks/useStockPrice'
import { usePortfolioStore } from '../store/portfolioStore'
import { useI18n } from '../hooks/useI18n'
import { SummaryCards } from '../components/Dashboard/SummaryCards'
import { PositionTable } from '../components/Dashboard/PositionTable'
import { DonutChart } from '../components/Dashboard/DonutChart'
import { PositionDetail } from '../components/Dashboard/PositionDetail'
import { PortfolioChart } from '../components/Dashboard/PortfolioChart'
import { Heatmap } from '../components/Dashboard/Heatmap'
import { MonthlyPLChart } from '../components/Dashboard/MonthlyPLChart'
import { ReminderBanner } from '../components/Dashboard/ReminderBanner'
import { PinnedNotes } from '../components/Dashboard/PinnedNotes'
import { TaxReport } from '../components/Dashboard/TaxReport'
import { RebalancingCalculator } from '../components/Dashboard/RebalancingCalculator'
import { DividendCalendar } from '../components/Dashboard/DividendCalendar'
import { BenchmarkChart } from '../components/Dashboard/BenchmarkChart'
import { PerformanceMetrics } from '../components/Dashboard/PerformanceMetrics'
import type { Position } from '../types'

export function DashboardPage() {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const manualPrices = usePortfolioStore((s) => s.manualPrices)
  const hiddenWidgets = usePortfolioStore((s) => s.hiddenWidgets)
  const { t } = useI18n()
  const rawPortfolio = usePortfolio()

  const priceItems = useMemo(
    () => rawPortfolio.positions.map((p) => ({ ticker: p.ticker, market: p.market })),
    [rawPortfolio.positions]
  )

  const { prices: fetchedPrices, loading, refresh } = useStockPrice(priceItems)

  const prices = useMemo(() => {
    const merged = new Map(fetchedPrices)
    for (const [ticker, price] of Object.entries(manualPrices)) {
      if (!merged.get(ticker)) merged.set(ticker, price)
    }
    return merged
  }, [fetchedPrices, manualPrices])

  const { positions, summary } = usePortfolio(prices)

  const liveSelected = selectedPosition
    ? (positions.find((p) => p.ticker === selectedPosition.ticker) ?? null)
    : null

  const isVisible = (id: string) => !hiddenWidgets.includes(id)

  return (
    <div className="space-y-5">
      {isVisible('reminders') && <ReminderBanner />}
      {isVisible('pinnedNotes') && <PinnedNotes />}
      {isVisible('summary') && <SummaryCards summary={summary} />}

      {/* Empty state */}
      {positions.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4 opacity-30">📈</div>
          <p className="text-lg font-semibold text-slate-300 mb-2">{t('empty.title')}</p>
          <p className="text-sm text-slate-500 mb-6 max-w-xs">{t('empty.desc')}</p>
        </div>
      )}

      {isVisible('portfolioChart') && <PortfolioChart />}

      {isVisible('performance') && <PerformanceMetrics positions={positions} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {isVisible('holdings') && (
          <div className="lg:col-span-2">
            <PositionTable
              positions={positions}
              loading={loading}
              onRefresh={refresh}
              onSelect={setSelectedPosition}
            />
          </div>
        )}
        {isVisible('donut') && (
          <div>
            <DonutChart positions={positions} />
          </div>
        )}
      </div>

      {(isVisible('heatmap') || isVisible('monthlyChart')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {isVisible('heatmap') && <Heatmap positions={positions} />}
          {isVisible('monthlyChart') && <MonthlyPLChart />}
        </div>
      )}

      {isVisible('benchmark') && <BenchmarkChart positions={positions} />}

      {(isVisible('taxReport') || isVisible('rebalancing')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {isVisible('taxReport') && <TaxReport />}
          {isVisible('rebalancing') && <RebalancingCalculator positions={positions} />}
        </div>
      )}

      {isVisible('dividendCalendar') && <DividendCalendar />}

      <PositionDetail
        position={liveSelected}
        onClose={() => setSelectedPosition(null)}
      />
    </div>
  )
}
