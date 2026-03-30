import { useMemo, useState, useEffect, useCallback } from 'react'
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
import { NewsWidget } from '../components/Dashboard/NewsWidget'
import { WIDGETS } from '../constants/widgets'
import type { Position } from '../types'

export function DashboardPage() {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const manualPrices = usePortfolioStore((s) => s.manualPrices)
  const hiddenWidgets = usePortfolioStore((s) => s.hiddenWidgets)
  const widgetOrder = usePortfolioStore((s) => s.widgetOrder)
  const addSnapshot = usePortfolioStore((s) => s.addSnapshot)
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate)
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

  // Save snapshot when prices load
  useEffect(() => {
    if (loading || positions.length === 0) return
    const valueKRW = positions.reduce((sum, p) => {
      const val = p.totalValue > 0 ? p.totalValue : p.totalCost
      return sum + (p.baseCurrency === 'USD' ? val * exchangeRate : val)
    }, 0)
    const costKRW = positions.reduce((sum, p) => {
      return sum + (p.baseCurrency === 'USD' ? p.totalCostKRW : p.totalCost)
    }, 0)
    if (valueKRW > 0) addSnapshot({ valueKRW, costKRW })
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const liveSelected = selectedPosition
    ? (positions.find((p) => p.ticker === selectedPosition.ticker) ?? null)
    : null

  const isVisible = (id: string) => !hiddenWidgets.includes(id)

  // Grid pairs: when rendering these widgets, render both together in a grid
  const PAIRS: [string, string][] = [
    ['holdings', 'donut'],
    ['heatmap', 'monthlyChart'],
    ['taxReport', 'rebalancing'],
  ]

  const getPairFor = (id: string): [string, string] | null => {
    return PAIRS.find((p) => p.includes(id)) ?? null
  }

  const renderedPairs = new Set<string>()

  const renderSection = useCallback((id: string): React.ReactNode => {
    // Check if this is part of a pair
    const pair = getPairFor(id)
    if (pair) {
      const pairKey = pair.join('-')
      if (renderedPairs.has(pairKey)) return null
      renderedPairs.add(pairKey)

      const [a, b] = pair
      const aVisible = isVisible(a)
      const bVisible = isVisible(b)
      if (!aVisible && !bVisible) return null

      if (a === 'holdings' && b === 'donut') {
        return (
          <div key={pairKey} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {aVisible && (
              <div className="lg:col-span-2">
                <PositionTable
                  positions={positions}
                  loading={loading}
                  onRefresh={refresh}
                  onSelect={setSelectedPosition}
                />
              </div>
            )}
            {bVisible && (
              <div>
                <DonutChart positions={positions} />
              </div>
            )}
          </div>
        )
      }

      if (a === 'heatmap' && b === 'monthlyChart') {
        return (
          <div key={pairKey} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {aVisible && <Heatmap positions={positions} />}
            {bVisible && <MonthlyPLChart />}
          </div>
        )
      }

      if (a === 'taxReport' && b === 'rebalancing') {
        return (
          <div key={pairKey} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {aVisible && <TaxReport />}
            {bVisible && <RebalancingCalculator positions={positions} />}
          </div>
        )
      }

      return null
    }

    if (!isVisible(id)) return null

    switch (id) {
      case 'reminders': return <ReminderBanner key={id} />
      case 'pinnedNotes': return <PinnedNotes key={id} />
      case 'summary': return <SummaryCards key={id} summary={summary} />
      case 'portfolioChart': return <PortfolioChart key={id} />
      case 'performance': return <PerformanceMetrics key={id} positions={positions} />
      case 'benchmark': return <BenchmarkChart key={id} positions={positions} />
      case 'dividendCalendar': return <DividendCalendar key={id} />
      case 'news': return <NewsWidget key={id} />
      default: return null
    }
  }, [positions, loading, refresh, summary, hiddenWidgets]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveOrder = widgetOrder.length > 0 ? widgetOrder : WIDGETS.map((w) => w.id)

  return (
    <div className="space-y-5">
      {/* Empty state */}
      {positions.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4 opacity-30">📈</div>
          <p className="text-lg font-semibold text-slate-300 mb-2">{t('empty.title')}</p>
          <p className="text-sm text-slate-500 mb-6 max-w-xs">{t('empty.desc')}</p>
        </div>
      )}

      {effectiveOrder.map((id) => renderSection(id))}

      <PositionDetail
        position={liveSelected}
        onClose={() => setSelectedPosition(null)}
      />
    </div>
  )
}
