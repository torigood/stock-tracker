import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { searchTickers } from '../data/tickerMap'
import { usePortfolioStore } from '../store/portfolioStore'
import { useI18n } from '../hooks/useI18n'
import type { TickerEntry } from '../types'

// ── Types ────────────────────────────────────────────────────────────────────

type Range = '1d' | '5d' | '1mo' | '3mo' | '1y'

const RANGE_CONFIG: { key: Range; labelKey: 'search.range1d' | 'search.range1w' | 'search.range1m' | 'search.range3m' | 'search.range1y'; interval: string }[] = [
  { key: '1d',  labelKey: 'search.range1d', interval: '5m' },
  { key: '5d',  labelKey: 'search.range1w', interval: '1h' },
  { key: '1mo', labelKey: 'search.range1m', interval: '1d' },
  { key: '3mo', labelKey: 'search.range3m', interval: '1d' },
  { key: '1y',  labelKey: 'search.range1y', interval: '1d' },
]

const DEFAULT_INDICES: TickerEntry[] = [
  { ticker: '^GSPC', name: 'S&P 500',    market: 'US' },
  { ticker: '^IXIC', name: 'NASDAQ',     market: 'US' },
  { ticker: '^DJI',  name: 'Dow Jones',  market: 'US' },
  { ticker: '^KS11', name: 'KOSPI',      market: 'KRX' },
  { ticker: '^KQ11', name: 'KOSDAQ',     market: 'KRX' },
]

interface QuoteMeta {
  longName?: string
  shortName?: string
  regularMarketPrice?: number
  regularMarketChangePercent?: number
  regularMarketChange?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  previousClose?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  regularMarketVolume?: number
  marketCap?: number
  currency?: string
}

interface MiniQuote {
  ticker: string
  price: number | null
  changePct: number | null
  currency: string
}

interface ChartPoint { t: number; price: number }

// ── API helpers ───────────────────────────────────────────────────────────────

function toYahooSymbol(entry: TickerEntry): string {
  if (entry.ticker.startsWith('^')) return entry.ticker
  if (entry.market === 'KRX') return `${entry.ticker}.KS`
  if (entry.market === 'ETF' && /^\d+$/.test(entry.ticker)) return `${entry.ticker}.KS`
  return entry.ticker
}

async function fetchMiniQuote(symbol: string): Promise<{ price: number | null; changePct: number | null; currency: string }> {
  try {
    const res = await fetch(`/api/yahoo?symbol=${encodeURIComponent(symbol)}&range=1d&interval=1d`)
    if (!res.ok) return { price: null, changePct: null, currency: 'USD' }
    const data = await res.json() as { chart: { result: Array<{ meta: QuoteMeta }> | null } }
    const meta = data?.chart?.result?.[0]?.meta
    return {
      price: meta?.regularMarketPrice ?? null,
      changePct: meta?.regularMarketChangePercent ?? null,
      currency: meta?.currency ?? 'USD',
    }
  } catch {
    return { price: null, changePct: null, currency: 'USD' }
  }
}

async function fetchFullQuote(symbol: string, range: Range, interval: string): Promise<{ meta: QuoteMeta; chart: ChartPoint[] } | null> {
  try {
    const res = await fetch(`/api/yahoo?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`)
    if (!res.ok) return null
    const data = await res.json() as { chart: { result: Array<{ meta: QuoteMeta; timestamp: number[]; indicators: { quote: Array<{ close: (number | null)[] }> } }> | null } }
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const timestamps = result.timestamp ?? []
    const closes = result.indicators?.quote?.[0]?.close ?? []
    const chart: ChartPoint[] = timestamps
      .map((t, i) => ({ t: t * 1000, price: closes[i] ?? null }))
      .filter((p): p is ChartPoint => p.price !== null)
    return { meta: result.meta, chart }
  } catch {
    return null
  }
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtPrice(n: number | null | undefined, currency?: string): string {
  if (n == null) return '—'
  if (currency === 'KRW' || (!currency && false)) return '₩' + Math.round(n).toLocaleString('ko-KR')
  // KRX index prices are in KRW points, show without symbol
  return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : n.toFixed(2)
}

function fmtFull(n: number | null | undefined, currency?: string): string {
  if (n == null) return '—'
  if (currency === 'KRW') return '₩' + Math.round(n).toLocaleString('ko-KR')
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtVol(n: number | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

function fmtCap(n: number | undefined, currency?: string): string {
  if (n == null) return '—'
  const sym = currency === 'KRW' ? '₩' : '$'
  if (n >= 1_000_000_000_000) return sym + (n / 1_000_000_000_000).toFixed(2) + 'T'
  if (n >= 1_000_000_000) return sym + (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return sym + (n / 1_000_000).toFixed(0) + 'M'
  return sym + n.toLocaleString()
}

function fmtTime(ts: number, range: Range): string {
  const d = new Date(ts)
  if (range === '1d') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (range === '5d') return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:00`
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

// ── Mini quote card ──────────────────────────────────────────────────────────

function QuoteCard({
  entry, isFavorite, onSelect, onToggleFav,
}: {
  entry: TickerEntry
  isFavorite: boolean
  onSelect: (e: TickerEntry) => void
  onToggleFav: (ticker: string) => void
}) {
  const [quote, setQuote] = useState<MiniQuote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const symbol = toYahooSymbol(entry)
    fetchMiniQuote(symbol).then((q) => {
      if (!cancelled) {
        setQuote({ ticker: entry.ticker, ...q })
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [entry])

  const up = (quote?.changePct ?? 0) >= 0

  return (
    <div className="card p-3.5 flex flex-col gap-1 cursor-pointer hover:border-indigo-500/50 transition-colors group relative"
      onClick={() => onSelect(entry)}>
      <button
        className={`absolute top-2.5 right-2.5 text-sm transition-colors ${isFavorite ? 'text-amber-400' : 'text-slate-700 group-hover:text-slate-500'}`}
        onClick={(e) => { e.stopPropagation(); onToggleFav(entry.ticker) }}
        title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      >★</button>
      <div className="pr-5">
        <p className="font-mono text-sm font-semibold text-slate-100">{entry.ticker.replace('^', '')}</p>
        <p className="text-[11px] text-slate-500 truncate">{entry.name}</p>
      </div>
      {loading ? (
        <div className="h-5 bg-slate-800 rounded animate-pulse mt-1" />
      ) : quote?.price != null ? (
        <div className="mt-0.5">
          <p className="font-mono text-sm text-slate-200">{fmtPrice(quote.price, quote.currency)}</p>
          <p className={`font-mono text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? '+' : ''}{(quote.changePct ?? 0).toFixed(2)}%
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-600 mt-1">—</p>
      )}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return (
    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{label}</p>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface Props {
  onAddTrade: () => void
}

export function StockSearchPage({ onAddTrade }: Props) {
  const trades = usePortfolioStore((s) => s.trades)
  const favorites = usePortfolioStore((s) => s.favorites)
  const toggleFavorite = usePortfolioStore((s) => s.toggleFavorite)
  const { t } = useI18n()

  const [query, setQuery]             = useState('')
  const [suggestions, setSuggestions] = useState<TickerEntry[]>([])
  const [showSug, setShowSug]         = useState(false)
  const [selected, setSelected]       = useState<TickerEntry | null>(null)
  const [range, setRange]             = useState<Range>('1mo')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(false)
  const [meta, setMeta]               = useState<QuoteMeta | null>(null)
  const [chart, setChart]             = useState<ChartPoint[]>([])

  const sugRef = useRef<HTMLDivElement>(null)

  // Unique portfolio tickers (as TickerEntry)
  const portfolioEntries = useMemo<TickerEntry[]>(() => {
    const seen = new Set<string>()
    const result: TickerEntry[] = []
    for (const tr of trades) {
      if (seen.has(tr.ticker)) continue
      result.push({ ticker: tr.ticker, name: tr.name, market: tr.market })
      seen.add(tr.ticker)
    }
    return result
  }, [trades])

  // Favorite entries (may include indices or arbitrary tickers)
  const favoriteEntries = useMemo<TickerEntry[]>(() => {
    return favorites.map((ticker) => {
      const idx = DEFAULT_INDICES.find((i) => i.ticker === ticker)
      if (idx) return idx
      const p = portfolioEntries.find((e) => e.ticker === ticker)
      if (p) return p
      return { ticker, name: ticker, market: 'US' as const }
    })
  }, [favorites, portfolioEntries])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sugRef.current && !sugRef.current.contains(e.target as Node)) setShowSug(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleQueryChange(val: string) {
    setQuery(val)
    if (!val.trim()) { setSuggestions([]); setShowSug(false); return }
    const staticRes = searchTickers(val)
    const seen = new Set(staticRes.map((r) => r.ticker))
    const portfolioRes: TickerEntry[] = []
    const seenP = new Set<string>()
    for (const tr of trades) {
      if (seen.has(tr.ticker) || seenP.has(tr.ticker)) continue
      if (tr.ticker.toUpperCase().includes(val.toUpperCase()) || tr.name.toLowerCase().includes(val.toLowerCase())) {
        portfolioRes.push({ ticker: tr.ticker, name: tr.name, market: tr.market })
        seenP.add(tr.ticker)
      }
    }
    // Also include indices in search
    const idxRes = DEFAULT_INDICES.filter(
      (i) => i.ticker.toLowerCase().includes(val.toLowerCase()) || i.name.toLowerCase().includes(val.toLowerCase())
    )
    const results = [...idxRes, ...staticRes, ...portfolioRes]
      .filter((r, i, arr) => arr.findIndex((x) => x.ticker === r.ticker) === i)
      .slice(0, 8)
    setSuggestions(results)
    setShowSug(results.length > 0)
  }

  function selectEntry(entry: TickerEntry) {
    setSelected(entry)
    setQuery(entry.ticker)
    setShowSug(false)
  }

  const loadData = useCallback(async (entry: TickerEntry, r: Range) => {
    setLoading(true); setError(false); setMeta(null); setChart([])
    const cfg = RANGE_CONFIG.find((c) => c.key === r)!
    const result = await fetchFullQuote(toYahooSymbol(entry), r, cfg.interval)
    setLoading(false)
    if (!result) { setError(true); return }
    setMeta(result.meta)
    setChart(result.chart)
  }, [])

  useEffect(() => {
    if (selected) loadData(selected, range)
  }, [selected, range, loadData])

  const changePct = meta?.regularMarketChangePercent ?? 0
  const changeColor = changePct >= 0 ? 'text-emerald-400' : 'text-red-400'
  const chartColor  = changePct >= 0 ? '#34d399' : '#f87171'
  const prevClose   = meta?.previousClose ?? chart[0]?.price
  const chartMin = chart.length ? Math.min(...chart.map((p) => p.price)) * 0.998 : undefined
  const chartMax = chart.length ? Math.max(...chart.map((p) => p.price)) * 1.002 : undefined

  const showGrid = !selected && !loading

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search bar */}
      <div ref={sugRef} className="relative">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSug(true)}
            placeholder={t('search.placeholder')}
            className="w-full bg-surface-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm transition-colors"
            autoFocus
          />
          {query && (
            <button onClick={() => { setQuery(''); setSuggestions([]); setShowSug(false); setSelected(null); setMeta(null); setChart([]) }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 text-lg">×</button>
          )}
        </div>
        {showSug && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-surface-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            {suggestions.map((s) => (
              <button key={s.ticker} type="button" onClick={() => selectEntry(s)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700 text-left transition-colors">
                <div>
                  <span className="font-mono text-sm text-slate-200">{s.ticker}</span>
                  <span className="text-slate-400 text-xs ml-2">{s.name}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  s.market === 'KRX' ? 'bg-blue-900/60 text-blue-300'
                  : s.market === 'US' ? 'bg-indigo-900/60 text-indigo-300'
                  : 'bg-amber-900/60 text-amber-300'}`}>{s.market}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Default grid (no selection) ───────────────────────────────────── */}
      {showGrid && (
        <div className="space-y-6">
          {/* Market indices */}
          <div>
            <SectionTitle label={t('search.indices')} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {DEFAULT_INDICES.map((entry) => (
                <QuoteCard key={entry.ticker} entry={entry}
                  isFavorite={favorites.includes(entry.ticker)}
                  onSelect={selectEntry} onToggleFav={toggleFavorite} />
              ))}
            </div>
          </div>

          {/* Favorites */}
          <div>
            <SectionTitle label={t('search.favorites')} />
            {favoriteEntries.length === 0 ? (
              <p className="text-xs text-slate-600 py-2">{t('search.favoritesEmpty')}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {favoriteEntries.map((entry) => (
                  <QuoteCard key={entry.ticker} entry={entry}
                    isFavorite={true}
                    onSelect={selectEntry} onToggleFav={toggleFavorite} />
                ))}
              </div>
            )}
          </div>

          {/* Portfolio holdings */}
          {portfolioEntries.length > 0 && (
            <div>
              <SectionTitle label={t('search.myHoldings')} />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {portfolioEntries.map((entry) => (
                  <QuoteCard key={entry.ticker} entry={entry}
                    isFavorite={favorites.includes(entry.ticker)}
                    onSelect={selectEntry} onToggleFav={toggleFavorite} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="card p-8 text-center text-slate-500 text-sm">{t('search.error')}</div>
      )}

      {/* ── Detail view ──────────────────────────────────────────────────── */}
      {!loading && !error && meta && selected && (
        <>
          <div className="card p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-100">
                    {meta.longName ?? meta.shortName ?? selected.name}
                  </h1>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    selected.market === 'KRX' ? 'bg-blue-900/50 text-blue-300'
                    : 'bg-indigo-900/50 text-indigo-300'}`}>{selected.market}</span>
                  {/* Favorite toggle in detail */}
                  <button onClick={() => toggleFavorite(selected.ticker)}
                    className={`text-lg transition-colors ${favorites.includes(selected.ticker) ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
                    title={favorites.includes(selected.ticker) ? '즐겨찾기 해제' : '즐겨찾기 추가'}>★</button>
                </div>
                <p className="font-mono text-sm text-slate-500">{selected.ticker}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-mono text-slate-100">
                  {fmtFull(meta.regularMarketPrice, meta.currency)}
                </p>
                <p className={`text-sm font-mono font-medium ${changeColor}`}>
                  {(meta.regularMarketChange ?? 0) >= 0 ? '+' : ''}
                  {fmtFull(meta.regularMarketChange, meta.currency)}{' '}
                  ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-800 mt-4 rounded-lg overflow-hidden">
              <StatCell label={t('search.prevClose')}  value={fmtFull(meta.previousClose, meta.currency)} />
              <StatCell label={t('search.dayRange')}   value={`${fmtFull(meta.regularMarketDayLow, meta.currency)} – ${fmtFull(meta.regularMarketDayHigh, meta.currency)}`} />
              <StatCell label={t('search.week52')}     value={`${fmtFull(meta.fiftyTwoWeekLow, meta.currency)} – ${fmtFull(meta.fiftyTwoWeekHigh, meta.currency)}`} />
              <StatCell label={t('search.volume')}     value={fmtVol(meta.regularMarketVolume)} />
              <StatCell label={t('search.marketCap')}  value={fmtCap(meta.marketCap, meta.currency)} />
            </div>

            {!selected.ticker.startsWith('^') && (
              <div className="mt-4">
                <button onClick={onAddTrade} className="btn-primary text-sm px-5 py-2">
                  {t('search.addTrade')} — {selected.ticker}
                </button>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="card p-5">
            <div className="flex items-center justify-end gap-1 mb-4">
              {RANGE_CONFIG.map(({ key, labelKey }) => (
                <button key={key} onClick={() => setRange(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    range === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                  {t(labelKey)}
                </button>
              ))}
            </div>
            {chart.length > 1 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={chartColor} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tickFormatter={(v: number) => fmtTime(v, range)}
                    tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={60} />
                  <YAxis domain={[chartMin ?? 'auto', chartMax ?? 'auto']}
                    tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={80}
                    tickFormatter={(v: number) => fmtFull(v, meta.currency)} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload as ChartPoint
                    return (
                      <div className="bg-surface-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                        <p className="text-slate-500 mb-1">{fmtTime(p.t, range)}</p>
                        <p className="font-mono font-semibold text-slate-100">{fmtFull(p.price, meta.currency)}</p>
                      </div>
                    )
                  }} />
                  {prevClose != null && (
                    <ReferenceLine y={prevClose} stroke="#475569" strokeDasharray="3 3" strokeWidth={1} />
                  )}
                  <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={1.5}
                    fill="url(#chartGrad)" dot={false} activeDot={{ r: 3, fill: chartColor }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-600 text-sm">{t('search.error')}</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-900 px-4 py-3">
      <p className="text-[11px] text-slate-600 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xs font-mono text-slate-200">{value}</p>
    </div>
  )
}
