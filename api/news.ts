export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url)
  const tickers = searchParams.get('tickers')
  if (!tickers) {
    return new Response(JSON.stringify({ news: [] }), { headers: { 'Content-Type': 'application/json' } })
  }

  const tickerList = tickers.split(',').slice(0, 5)
  const allNews: unknown[] = []

  await Promise.allSettled(tickerList.map(async (ticker) => {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&lang=en-US&region=US&quotesCount=0&newsCount=5&enableFuzzyQuery=false`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    })
    if (!res.ok) return
    const data = await res.json() as { news?: unknown[] }
    if (data.news) allNews.push(...data.news)
  }))

  // Deduplicate by title and sort by time
  const seen = new Set<string>()
  const deduped = allNews.filter((item) => {
    const n = item as { title?: string }
    if (!n.title || seen.has(n.title)) return false
    seen.add(n.title)
    return true
  }).sort((a, b) => {
    const na = a as { providerPublishTime?: number }
    const nb = b as { providerPublishTime?: number }
    return (nb.providerPublishTime ?? 0) - (na.providerPublishTime ?? 0)
  }).slice(0, 10)

  return new Response(JSON.stringify({ news: deduped }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
