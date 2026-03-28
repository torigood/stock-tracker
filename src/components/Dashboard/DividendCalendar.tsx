import { useMemo } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { convertToDisplay, getBaseCurrency } from '../../utils/calculations'
import { useCurrency } from '../../hooks/useCurrency'
import { useI18n } from '../../hooks/useI18n'

const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const MONTH_LABELS_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'] as const

export function DividendCalendar() {
  const trades = usePortfolioStore((s) => s.trades)
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency)
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate)
  const exchangeRateOverride = usePortfolioStore((s) => s.exchangeRateOverride)
  const { fmtAmount } = useCurrency()
  const { t, language } = useI18n()

  const effectiveRate = exchangeRateOverride ?? exchangeRate
  const monthLabels = language === 'ko' ? MONTH_LABELS_KO : MONTH_LABELS_EN

  const { gridData, years, grandTotal } = useMemo(() => {
    const map: Record<number, Record<number, number>> = {}

    for (const trade of trades) {
      if (trade.type !== 'dividend') continue
      const date = new Date(trade.date)
      const year = date.getFullYear()
      const month = date.getMonth() // 0-indexed
      const base = getBaseCurrency(trade.market, trade.ticker)
      const converted = convertToDisplay(trade.price, base, displayCurrency, effectiveRate)
      if (!map[year]) map[year] = {}
      map[year][month] = (map[year][month] ?? 0) + converted
    }

    const years = Object.keys(map).map(Number).sort((a, b) => a - b)
    let grandTotal = 0
    for (const yearData of Object.values(map)) {
      for (const val of Object.values(yearData)) grandTotal += val
    }
    return { gridData: map, years, grandTotal }
  }, [trades, displayCurrency, effectiveRate])

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-300 mb-4">{t('divCal.title')}</p>

      {years.length === 0 ? (
        <p className="text-slate-500 text-sm">{t('divCal.noData')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 pr-3 text-slate-500 font-medium min-w-[3rem]" />
                {monthLabels.map((label) => (
                  <th key={label} className="text-right py-2 px-1 text-slate-500 font-medium min-w-[4rem]">
                    {label}
                  </th>
                ))}
                <th className="text-right py-2 pl-3 text-slate-500 font-medium min-w-[4.5rem]">
                  {t('divCal.total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {years.map((year) => {
                const yearData = gridData[year] ?? {}
                const rowTotal = Object.values(yearData).reduce((s, v) => s + v, 0)
                return (
                  <tr key={year} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 pr-3 text-slate-300 font-semibold">{year}</td>
                    {Array.from({ length: 12 }, (_, m) => {
                      const val = yearData[m]
                      return (
                        <td key={m} className="py-2.5 px-1 text-right tabular-nums font-mono">
                          {val != null && val > 0 ? (
                            <span className="text-sky-400">{fmtAmount(val, displayCurrency)}</span>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="py-2.5 pl-3 text-right tabular-nums font-mono text-slate-100 font-medium">
                      {fmtAmount(rowTotal, displayCurrency)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700">
                <td className="py-2.5 pr-3 text-slate-400 font-semibold">{t('divCal.total')}</td>
                {Array.from({ length: 12 }, (_, m) => {
                  const colTotal = years.reduce((s, y) => s + (gridData[y]?.[m] ?? 0), 0)
                  return (
                    <td key={m} className="py-2.5 px-1 text-right tabular-nums font-mono">
                      {colTotal > 0 ? (
                        <span className="text-slate-300 font-medium">{fmtAmount(colTotal, displayCurrency)}</span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="py-2.5 pl-3 text-right tabular-nums font-mono text-emerald-400 font-semibold">
                  {fmtAmount(grandTotal, displayCurrency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
