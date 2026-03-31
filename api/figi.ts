// Vercel Serverless Function — OpenFIGI ISIN → Ticker resolver

interface FigiItem {
  ticker?: string
  exchCode?: string
  marketSector?: string
  shareClassFIGI?: string
}

interface FigiResponse {
  data?: FigiItem[]
  error?: string
}

const US_EXCH_CODES = new Set(['UN', 'UW', 'UA', 'UQ', 'UM', 'UV', 'UE'])

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { isins } = (await req.json()) as { isins: string[] }
  if (!isins?.length) {
    return new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = isins.map((isin) => ({ idType: 'ID_ISIN', idValue: isin }))

  const figiRes = await fetch('https://api.openfigi.com/v3/mapping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!figiRes.ok) {
    return new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const data = (await figiRes.json()) as FigiResponse[]
  const result: Record<string, { ticker: string; market: string }> = {}

  isins.forEach((isin, i) => {
    const items = data[i]?.data
    if (!items?.length) return

    // Prefer US-listed equities, then fall back to first result
    const item =
      items.find((d) => d.exchCode && US_EXCH_CODES.has(d.exchCode)) ??
      items[0]

    if (!item?.ticker) return

    const market = isin.startsWith('US') ? 'US' : 'US'
    result[isin] = { ticker: item.ticker, market }
  })

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
}
