import { sql } from '@vercel/postgres'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface AlertRow {
  id: string
  email: string
  ticker: string
  target_price: number
  direction: string
}

async function fetchPrice(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    })
    if (!res.ok) return null
    const data = await res.json() as { chart: { result: Array<{ meta: { regularMarketPrice?: number } }> | null } }
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

export default async function handler() {
  try {
    // Get all unfired alerts
    const { rows } = await sql<AlertRow>`
      SELECT id, email, ticker, target_price, direction
      FROM email_alerts
      WHERE fired_at IS NULL
    `

    if (rows.length === 0) return new Response('No alerts', { status: 200 })

    // Get unique tickers
    const tickers = [...new Set(rows.map(r => r.ticker))]
    const prices = new Map<string, number>()

    await Promise.allSettled(tickers.map(async (ticker) => {
      const price = await fetchPrice(ticker)
      if (price != null) prices.set(ticker, price)
    }))

    // Check each alert
    const triggered: AlertRow[] = []
    for (const alert of rows) {
      const price = prices.get(alert.ticker)
      if (price == null) continue

      const hit = alert.direction === 'above'
        ? price >= alert.target_price
        : price <= alert.target_price

      if (hit) triggered.push(alert)
    }

    // Send emails and mark as fired
    for (const alert of triggered) {
      const price = prices.get(alert.ticker)!
      const subject = `[StockTracker] ${alert.ticker} 목표가 도달 알림`
      const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #6366f1;">📈 목표가 도달!</h2>
          <p><strong>${alert.ticker}</strong>의 현재가가 목표가에 도달했습니다.</p>
          <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; color: #94a3b8;">종목</td>
              <td style="padding: 8px; font-weight: bold;">${alert.ticker}</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding: 8px; color: #94a3b8;">현재가</td>
              <td style="padding: 8px; color: #10b981; font-weight: bold;">$${price.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #94a3b8;">목표가</td>
              <td style="padding: 8px;">$${alert.target_price.toFixed(2)}</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 12px;">StockTracker에서 발송된 알림입니다.</p>
        </div>
      `

      await resend.emails.send({
        from: 'StockTracker <alerts@resend.dev>',
        to: alert.email,
        subject,
        html,
      })

      await sql`UPDATE email_alerts SET fired_at = NOW() WHERE id = ${alert.id}`
    }

    return new Response(JSON.stringify({ checked: rows.length, triggered: triggered.length }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
