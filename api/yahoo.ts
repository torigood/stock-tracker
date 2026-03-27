// Vercel Edge Function — Yahoo Finance 프록시
// /api/yahoo?symbol=AAPL
// /api/yahoo?symbol=AAPL&period1=1700000000&period2=1700086400  (과거 날짜)
export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'symbol query param required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const period1 = searchParams.get('period1')
  const period2 = searchParams.get('period2')

  const query = period1 && period2
    ? `interval=1d&period1=${period1}&period2=${period2}`
    : `interval=1d&range=1d`

  const yahooUrl =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`

  const upstream = await fetch(yahooUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  })

  const body = await upstream.text()

  return new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
