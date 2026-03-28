import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { usePortfolioStore } from '../../store/portfolioStore'
import { computeRealizedPL, convertToDisplay } from '../../utils/calculations'
import { useCurrency } from '../../hooks/useCurrency'
import { useI18n } from '../../hooks/useI18n'

function abbreviate(n: number, currency: 'KRW' | 'USD'): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (currency === 'KRW') {
    if (abs >= 100_000_000) return sign + (abs / 100_000_000).toFixed(1) + '억'
    if (abs >= 10_000) return sign + Math.round(abs / 10_000) + '만'
    return sign + Math.round(abs).toLocaleString()
  }
  if (abs >= 1_000_000) return (n < 0 ? '-$' : '$') + (abs / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return (n < 0 ? '-$' : '$') + (abs / 1_000).toFixed(1) + 'K'
  return (n < 0 ? '-$' : '$') + abs.toFixed(0)
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  displayCurrency: 'KRW' | 'USD'
  fmtAmount: (n: number, c: 'KRW' | 'USD') => string
}

function CustomTooltip({ active, payload, label, displayCurrency, fmtAmount }: TooltipProps) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="bg-surface-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-500 mb-1">{label}</p>
      <p className={`font-mono font-semibold ${v >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {v >= 0 ? '+' : ''}{fmtAmount(v, displayCurrency)}
      </p>
    </div>
  )
}

export function MonthlyPLChart() {
  const trades = usePortfolioStore((s) => s.trades)
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency)
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate)
  const exchangeRateOverride = usePortfolioStore((s) => s.exchangeRateOverride)
  const { fmtAmount } = useCurrency()
  const { t } = useI18n()

  const effectiveRate = exchangeRateOverride ?? exchangeRate

  const data = useMemo(() => {
    const records = computeRealizedPL(trades)
    if (records.length === 0) return []

    // We need trade dates to bucket by month — use the sell/dividend trades
    const byMonth = new Map<string, number>()

    for (const trade of trades) {
      if (trade.type !== 'sell' && trade.type !== 'dividend') continue
      const month = trade.date.slice(0, 7) // YYYY-MM

      // Get this ticker's P&L contribution from realized records
      // Simplification: attribute the realized PL to the sell month
      if (trade.type === 'dividend') {
        const base = trade.market === 'KRX' ? 'KRW' : 'USD'
        const displayAmt = convertToDisplay(trade.price, base, displayCurrency, effectiveRate)
        byMonth.set(month, (byMonth.get(month) ?? 0) + displayAmt)
      }
    }

    // For sells, use the records' realizedPL and attribute to last sell date per ticker
    for (const record of records) {
      if (record.dividendTotal > 0) continue // already counted above
      // Find the sell trades for this ticker
      const sellTrades = trades
        .filter((t) => t.ticker === record.ticker && t.type === 'sell')
        .sort((a, b) => a.date.localeCompare(b.date))

      if (sellTrades.length === 0) continue
      // Distribute PL across sell months proportionally
      const totalSellAmt = sellTrades.reduce((sum, t) => sum + t.quantity * t.price, 0)
      for (const sell of sellTrades) {
        const weight = totalSellAmt > 0 ? (sell.quantity * sell.price) / totalSellAmt : 1 / sellTrades.length
        const pl = record.realizedPL * weight
        const displayPL = convertToDisplay(pl, record.baseCurrency, displayCurrency, effectiveRate)
        const month = sell.date.slice(0, 7)
        byMonth.set(month, (byMonth.get(month) ?? 0) + displayPL)
      }
    }

    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, pl]) => ({
        month: month.slice(2).replace('-', '.'), // YY.MM
        pl: Math.round(pl),
      }))
  }, [trades, displayCurrency, effectiveRate])

  if (data.length === 0) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-slate-300 mb-1">{t('chart.monthlyTitle')}</p>
        <div className="h-[160px] flex items-center justify-center text-slate-600 text-sm">
          {t('chart.monthlyEmpty')}
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-300 mb-4">{t('chart.monthlyTitle')}</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v: number) => abbreviate(v, displayCurrency)}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip displayCurrency={displayCurrency} fmtAmount={fmtAmount} />} />
          <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
          <Bar dataKey="pl" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.pl >= 0 ? '#34d399' : '#f87171'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
