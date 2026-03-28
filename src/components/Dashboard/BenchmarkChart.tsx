import { useState, useEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import type { Position } from '../../types'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useI18n } from '../../hooks/useI18n'

interface Props {
  positions: Position[]
}

interface BenchmarkResult {
  returnPct: number | null
  error: boolean
}

interface YahooQuote {
  chart: {
    result: Array<{
      indicators: {
        quote: Array<{ close: (number | null)[] }>
      }
    }> | null
  }
}

async function fetchBenchmarkReturn(symbol: string, period1: number, period2: number): Promise<number | null> {
  const url = `/api/yahoo?symbol=${encodeURIComponent(symbol)}&period1=${period1}&period2=${period2}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as YahooQuote
  const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close
  if (!closes || closes.length === 0) return null
  const startPrice = closes.find((c) => c != null) ?? null
  const lastClose = [...closes].reverse().find((c) => c != null) ?? null
  if (startPrice == null || lastClose == null || startPrice === 0) return null
  return ((lastClose - startPrice) / startPrice) * 100
}

export function BenchmarkChart({ positions }: Props) {
  const trades = usePortfolioStore((s) => s.trades)
  const { t } = useI18n()

  const firstTradeDate = useMemo(() => {
    const active = trades.filter((tr) => tr.type === 'buy' || tr.type === 'sell' || tr.type === 'dividend')
    if (active.length === 0) return null
    return active.map((tr) => tr.date).sort()[0]
  }, [trades])

  const { totalValue, totalInvested } = useMemo(() => {
    const tv = positions.reduce((s, p) => s + (p.totalValue > 0 ? p.totalValue : p.totalCost), 0)
    const ti = positions.reduce((s, p) => s + p.totalCost, 0)
    return { totalValue: tv, totalInvested: ti }
  }, [positions])

  const portfolioReturn = useMemo<number | null>(() => {
    if (totalInvested === 0) return null
    return ((totalValue - totalInvested) / totalInvested) * 100
  }, [totalValue, totalInvested])

  const [sp500, setSp500] = useState<BenchmarkResult>({ returnPct: null, error: false })
  const [kospi, setKospi] = useState<BenchmarkResult>({ returnPct: null, error: false })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!firstTradeDate) return
    const period1 = dayjs(firstTradeDate).unix()
    const period2 = dayjs().unix()
    setLoading(true)
    setSp500({ returnPct: null, error: false })
    setKospi({ returnPct: null, error: false })
    let cancelled = false
    Promise.allSettled([
      fetchBenchmarkReturn('^GSPC', period1, period2),
      fetchBenchmarkReturn('^KS11', period1, period2),
    ]).then(([sp500Res, kospiRes]) => {
      if (cancelled) return
      setSp500({ returnPct: sp500Res.status === 'fulfilled' ? sp500Res.value : null, error: sp500Res.status === 'rejected' })
      setKospi({ returnPct: kospiRes.status === 'fulfilled' ? kospiRes.value : null, error: kospiRes.status === 'rejected' })
      setLoading(false)
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [firstTradeDate])

  const fmtReturn = (pct: number | null): string => {
    if (loading) return '…'
    if (pct == null) return t('benchmark.noData')
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
  }

  const retColor = (pct: number | null): string => {
    if (pct == null) return 'text-slate-400'
    return pct >= 0 ? 'text-emerald-400' : 'text-red-400'
  }

  if (!firstTradeDate || trades.length === 0) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-slate-300 mb-2">{t('benchmark.title')}</p>
        <p className="text-slate-500 text-sm">{t('benchmark.noData')}</p>
      </div>
    )
  }

  const sinceSub = t('benchmark.since', { date: firstTradeDate })

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-300">{t('benchmark.title')}</p>
        <span className="text-xs text-slate-500">{sinceSub}</span>
      </div>

      {loading && (
        <p className="text-slate-500 text-xs mb-3 animate-pulse">{t('benchmark.loading')}</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <BenchCard label={t('benchmark.portfolio')} value={portfolioReturn != null ? `${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn.toFixed(2)}%` : '—'} color={retColor(portfolioReturn)} sub={sinceSub} />
        <BenchCard label={t('benchmark.sp500')} value={fmtReturn(sp500.returnPct)} color={retColor(sp500.returnPct)} sub={sinceSub} />
        <BenchCard label={t('benchmark.kospi')} value={fmtReturn(kospi.returnPct)} color={retColor(kospi.returnPct)} sub={sinceSub} />
      </div>

      {!loading && portfolioReturn != null && (
        <div className="mt-3 space-y-1.5">
          {[{ label: t('benchmark.sp500'), pct: sp500.returnPct }, { label: t('benchmark.kospi'), pct: kospi.returnPct }].map(({ label, pct }) => {
            if (pct == null) return null
            const diff = portfolioReturn - pct
            return (
              <div key={label} className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-28 shrink-0">{t('benchmark.portfolio')} vs {label}</span>
                <span className={`font-semibold tabular-nums font-mono ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BenchCard({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div className="bg-surface-800 border border-slate-800 rounded-lg p-3 flex flex-col gap-1">
      <span className="text-slate-500 text-[11px] font-medium truncate">{label}</span>
      <span className={`text-base font-bold tabular-nums font-mono ${color}`}>{value}</span>
      <span className="text-slate-600 text-[10px]">{sub}</span>
    </div>
  )
}
