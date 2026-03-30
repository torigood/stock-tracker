import { useState, useEffect, useMemo } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useI18n } from '../../hooks/useI18n'

interface NewsItem {
  title: string
  link: string
  publisher: string
  providerPublishTime: number
}

export function NewsWidget() {
  const trades = usePortfolioStore((s) => s.trades)
  const { t } = useI18n()
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  // Get unique US tickers from portfolio
  const usTickers = useMemo(() => {
    const seen = new Set<string>()
    for (const tr of trades) {
      if ((tr.market === 'US' || (tr.market === 'ETF' && !/^\d+$/.test(tr.ticker))) && !seen.has(tr.ticker)) {
        seen.add(tr.ticker)
      }
    }
    return [...seen].slice(0, 5) // Max 5 tickers
  }, [trades])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (usTickers.length === 0) { setLoading(false); return }

    setLoading(true)
    fetch(`/api/news?tickers=${encodeURIComponent(usTickers.join(','))}`)
      .then(r => r.json())
      .then((data: { news?: NewsItem[] }) => {
        setNews(data.news ?? [])
      })
      .catch(() => setNews([]))
      .finally(() => setLoading(false))
  }, [usTickers.join(',')])  // eslint-disable-line

  function timeAgo(ts: number): string {
    const diff = Date.now() / 1000 - ts
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-300 mb-4">{t('news.title')}</p>

      {usTickers.length === 0 ? (
        <p className="text-slate-500 text-sm">{t('news.noHoldings')}</p>
      ) : loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-10 bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      ) : news.length === 0 ? (
        <p className="text-slate-500 text-sm">{t('news.noData')}</p>
      ) : (
        <div className="space-y-3">
          {news.slice(0, 8).map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <p className="text-sm text-slate-300 group-hover:text-indigo-300 transition-colors leading-snug line-clamp-2">
                {item.title}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {item.publisher} · {timeAgo(item.providerPublishTime)}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
