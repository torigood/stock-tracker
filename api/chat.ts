// Vercel Serverless Function — AI Chat (OpenRouter + tool calling)

const DISCLAIMER =
  '\n\n---\n*이 정보는 참고용이며, 투자 결정의 근거로 삼지 마세요.*'

const CACHE_TTL = 60_000
const priceCache = new Map<string, { price: number; currency: string; ts: number }>()

async function fetchStockPrice(symbol: string): Promise<{ price: number; currency: string } | null> {
  const cached = priceCache.get(symbol)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { price: cached.price, currency: cached.currency }
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    const result = (data?.chart as Record<string, unknown>)?.result as Record<string, unknown>[] | undefined
    const meta = result?.[0]?.meta as Record<string, unknown> | undefined
    const price = meta?.regularMarketPrice as number | undefined
    const currency = (meta?.currency as string) ?? 'USD'
    if (!price) return null
    priceCache.set(symbol, { price, currency, ts: Date.now() })
    return { price, currency }
  } catch {
    return null
  }
}

interface PortfolioItem {
  ticker: string
  name: string
  market: string
  quantity: number
  avgPrice: number
  totalCost: number
}

interface ChatMessage {
  role: string
  content: unknown
  tool_calls?: unknown[]
  tool_call_id?: string
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { messages, portfolio } = (await req.json()) as {
    messages: Array<{ role: string; content: string }>
    portfolio: PortfolioItem[]
  }

  const portfolioText = portfolio?.length
    ? portfolio
        .map(
          (p) =>
            `- ${p.ticker} (${p.name}, ${p.market}): ${p.quantity}주, 평균단가 ${p.avgPrice.toFixed(2)}, 총 투자금 ${Math.round(p.totalCost).toLocaleString()}`
        )
        .join('\n')
    : '포트폴리오 없음'

  const systemPrompt = `당신은 주식 포트폴리오 도우미입니다. 사용자의 포트폴리오 데이터를 기반으로 재무 정보와 주가 데이터를 조회하고 설명합니다.

현재 포트폴리오:
${portfolioText}

규칙:
- 특정 매수/매도를 직접 추천하지 않습니다
- 미래 주가를 예측하지 않습니다
- 재무지표와 현재 데이터를 객관적으로 설명합니다
- 현재 주가가 필요하면 get_stock_price 도구를 사용합니다
- 한국어로 답변합니다`

  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_stock_price',
        description:
          '종목 심볼의 현재 실시간 주가를 Yahoo Finance에서 조회합니다',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description:
                '주식 심볼 (미국주식: AAPL, 한국주식: 005930.KS)',
            },
          },
          required: ['symbol'],
        },
      },
    },
  ]

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const model = process.env.CHAT_MODEL ?? 'google/gemini-flash-1.5'

  for (let i = 0; i < 5; i++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://stock-tracker.vercel.app',
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        tools,
        tool_choice: 'auto',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return new Response(
        JSON.stringify({ error: `LLM API error: ${errText}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message: ChatMessage; finish_reason: string }>
    }
    const choice = data.choices?.[0]
    if (!choice) {
      return new Response(
        JSON.stringify({ error: 'No response from LLM' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const msg = choice.message
    chatMessages.push(msg)

    if (!msg.tool_calls?.length) {
      const content = (typeof msg.content === 'string' ? msg.content : '') + DISCLAIMER
      return new Response(JSON.stringify({ content }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    for (const toolCall of msg.tool_calls as Array<{
      id: string
      function: { name: string; arguments: string }
    }>) {
      let result: string
      if (toolCall.function.name === 'get_stock_price') {
        const args = JSON.parse(toolCall.function.arguments) as { symbol: string }
        const priceData = await fetchStockPrice(args.symbol)
        result = priceData
          ? `${args.symbol} 현재가: ${priceData.price} ${priceData.currency}`
          : `${args.symbol} 주가 조회 실패 (심볼을 확인해주세요)`
      } else {
        result = '알 수 없는 도구입니다'
      }

      chatMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }
  }

  return new Response(
    JSON.stringify({ error: '최대 반복 횟수를 초과했습니다' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
