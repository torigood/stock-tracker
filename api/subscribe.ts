import { sql } from '@vercel/postgres'

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json() as { email: string; targets: { ticker: string; targetPrice: number }[] }
    const { email, targets } = body

    if (!email || !targets?.length) {
      return new Response(JSON.stringify({ error: 'email and targets required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    // Delete existing alerts for this email (replace all)
    await sql`DELETE FROM email_alerts WHERE email = ${email}`

    // Insert new alerts
    for (const target of targets) {
      await sql`
        INSERT INTO email_alerts (email, ticker, target_price, direction)
        VALUES (${email}, ${target.ticker}, ${target.targetPrice}, 'above')
      `
    }

    return new Response(JSON.stringify({ success: true, count: targets.length }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
