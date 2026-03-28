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

const WIDGETS = [
  { id: 'reminders',       labelKey: 'widget.reminders' as const },
  { id: 'pinnedNotes',     labelKey: 'widget.pinnedNotes' as const },
  { id: 'summary',         labelKey: 'widget.summary' as const },
  { id: 'portfolioChart',  labelKey: 'widget.portfolioChart' as const },
  { id: 'holdings',        labelKey: 'widget.holdings' as const },
  { id: 'heatmap',         labelKey: 'widget.heatmap' as const },
  { id: 'monthlyChart',    labelKey: 'widget.monthlyChart' as const },
  { id: 'performance',     labelKey: 'widget.performance' as const },
  { id: 'benchmark',       labelKey: 'widget.benchmark' as const },
  { id: 'taxReport',       labelKey: 'widget.taxReport' as const },
  { id: 'rebalancing',     labelKey: 'widget.rebalancing' as const },
  { id: 'dividendCalendar',labelKey: 'widget.dividendCalendar' as const },
]

export function DashboardPage() {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [showWidgetPanel, setShowWidgetPanel] = useState(false)
  const manualPrices = usePortfolioStore((s) => s.manualPrices)
  const hiddenWidgets = usePortfolioStore((s) => s.hiddenWidgets)
  const setWidgetHidden = usePortfolioStore((s) => s.setWidgetHidden)
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
      {/* Widget toggle button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowWidgetPanel(!showWidgetPanel)}
          className="text-xs text-slate-600 hover:text-indigo-400 transition-colors"
        >
          {t('widget.showHide')}
        </button>
      </div>

      {/* Widget panel */}
      {showWidgetPanel && (
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">{t('widget.showHide')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {WIDGETS.map(({ id, labelKey }) => (
              <label key={id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isVisible(id)}
                  onChange={(e) => setWidgetHidden(id, !e.target.checked)}
                  className="accent-indigo-500"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{t(labelKey)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {isVisible('reminders') && <ReminderBanner />}
      {isVisible('pinnedNotes') && <PinnedNotes />}
      {isVisible('summary') && <SummaryCards summary={summary} />}
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
        <div>
          <DonutChart positions={positions} />
        </div>
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
