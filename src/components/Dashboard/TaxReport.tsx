import { useMemo } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { computeRealizedPL, convertToDisplay, getBaseCurrency } from '../../utils/calculations'
import { useCurrency } from '../../hooks/useCurrency'
import { useI18n } from '../../hooks/useI18n'

interface YearRow {
  year: number
  realizedGain: number
  dividends: number
  total: number
  estimatedTax: number
}

export function TaxReport() {
  const trades = usePortfolioStore((s) => s.trades)
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency)
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate)
  const exchangeRateOverride = usePortfolioStore((s) => s.exchangeRateOverride)
  const taxRate = usePortfolioStore((s) => s.taxRate)
  const costBasisMethod = usePortfolioStore((s) => s.costBasisMethod)
  const { fmtAmount } = useCurrency()
  const { t } = useI18n()

  const effectiveRate = exchangeRateOverride ?? exchangeRate

  const rows = useMemo<YearRow[]>(() => {
    const byYear: Record<number, { realizedGain: number; dividends: number }> = {}

    // Dividends: attribute to trade year
    for (const trade of trades) {
      if (trade.type !== 'dividend') continue
      const year = new Date(trade.date).getFullYear()
      if (!byYear[year]) byYear[year] = { realizedGain: 0, dividends: 0 }
      const base = getBaseCurrency(trade.market, trade.ticker)
      const converted = convertToDisplay(trade.price, base, displayCurrency, effectiveRate)
      byYear[year].dividends += converted
    }

    // Realized gains: attribute to sell year proportionally (same logic as MonthlyPLChart)
    const records = computeRealizedPL(trades, costBasisMethod)
    for (const record of records) {
      if (record.dividendTotal > 0) continue
      const sellTrades = trades
        .filter((tr) => tr.ticker === record.ticker && tr.type === 'sell')
        .sort((a, b) => a.date.localeCompare(b.date))
      if (sellTrades.length === 0) continue
      const totalSellAmt = sellTrades.reduce((sum, tr) => sum + tr.quantity * tr.price, 0)
      for (const sell of sellTrades) {
        const weight = totalSellAmt > 0 ? (sell.quantity * sell.price) / totalSellAmt : 1 / sellTrades.length
        const pl = record.realizedPL * weight
        const converted = convertToDisplay(pl, record.baseCurrency, displayCurrency, effectiveRate)
        const year = new Date(sell.date).getFullYear()
        if (!byYear[year]) byYear[year] = { realizedGain: 0, dividends: 0 }
        byYear[year].realizedGain += converted
      }
    }

    return Object.entries(byYear)
      .map(([yearStr, data]) => {
        const year = Number(yearStr)
        const total = data.realizedGain + data.dividends
        const estimatedTax = total > 0 ? total * taxRate : 0
        return { year, ...data, total, estimatedTax }
      })
      .sort((a, b) => b.year - a.year)
  }, [trades, displayCurrency, effectiveRate, taxRate, costBasisMethod])

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-300 mb-4">{t('tax.title')}</p>

      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm">{t('tax.noData')}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 pr-4 text-slate-500 font-medium">{t('tax.year')}</th>
                  <th className="text-right py-2 pr-4 text-slate-500 font-medium">{t('tax.realizedGain')}</th>
                  <th className="text-right py-2 pr-4 text-slate-500 font-medium">{t('tax.dividends')}</th>
                  <th className="text-right py-2 pr-4 text-slate-500 font-medium">{t('tax.total')}</th>
                  <th className="text-right py-2 text-slate-500 font-medium">
                    {t('tax.estimatedTax', { rate: Math.round(taxRate * 100) })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.year} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 pr-4 text-slate-200 font-medium">{row.year}</td>
                    <td className={`py-2.5 pr-4 text-right tabular-nums font-mono ${row.realizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {row.realizedGain !== 0 ? (row.realizedGain >= 0 ? '+' : '') + fmtAmount(row.realizedGain, displayCurrency) : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums font-mono text-sky-400">
                      {row.dividends > 0 ? '+' + fmtAmount(row.dividends, displayCurrency) : '—'}
                    </td>
                    <td className={`py-2.5 pr-4 text-right tabular-nums font-mono font-medium ${row.total >= 0 ? 'text-slate-100' : 'text-red-400'}`}>
                      {(row.total >= 0 ? '+' : '') + fmtAmount(row.total, displayCurrency)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-mono text-amber-400">
                      {row.estimatedTax > 0 ? fmtAmount(row.estimatedTax, displayCurrency) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10px] text-slate-600">{t('tax.disclaimer')}</p>
        </>
      )}
    </div>
  )
}
