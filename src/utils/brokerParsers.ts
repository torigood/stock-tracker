import type { Trade, Market } from '../types'

type BrokerFormat = 'kiwoom' | 'mirae' | 'nh' | 'overseas' | 'unknown'

const TYPE_MAP: Record<string, Trade['type']> = {
  '매수': 'buy', '매도': 'sell', '배당': 'dividend', '분할': 'split',
  'buy': 'buy', 'sell': 'sell', 'dividend': 'dividend', 'split': 'split',
  '현금배당': 'dividend', '주식매수': 'buy', '주식매도': 'sell',
  '구매': 'buy', '판매': 'sell', '배당금입금': 'dividend',
}

// ISIN → ticker mapping for common overseas stocks
const ISIN_TO_TICKER: Record<string, { ticker: string; market: Market }> = {
  'US67066G1040': { ticker: 'NVDA', market: 'US' },
  'US88160R1014': { ticker: 'TSLA', market: 'US' },
  'US46090E1038': { ticker: 'QQQ', market: 'ETF' },
  'US74766W1080': { ticker: 'QUBT', market: 'US' },
  'US8361001071': { ticker: 'SOUN', market: 'US' },
  'US80359A2050': { ticker: 'PDYN', market: 'US' },
  'VGG794831062': { ticker: 'XYZ', market: 'US' },
  'US0231351067': { ticker: 'AMZN', market: 'US' },
  'US0378331005': { ticker: 'AAPL', market: 'US' },
  'US5949181045': { ticker: 'MSFT', market: 'US' },
  'US02079K3059': { ticker: 'GOOGL', market: 'US' },
  'US30303M1027': { ticker: 'META', market: 'US' },
  'US9314271084': { ticker: 'WMT', market: 'US' },
  'US4592001014': { ticker: 'IBM', market: 'US' },
  'US2546871060': { ticker: 'DIS', market: 'US' },
  'US70450Y1038': { ticker: 'PLTR', market: 'US' },
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      let cell = ''; i++
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { cell += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else { cell += line[i++] }
      }
      cells.push(cell)
      if (line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) { cells.push(line.slice(i)); break }
      cells.push(line.slice(i, end))
      i = end + 1
    }
  }
  return cells
}

function detectBroker(headers: string[]): BrokerFormat {
  const h = headers.join(',').toLowerCase()
  if (h.includes('체결일자') && h.includes('종목코드') && h.includes('체결수량')) return 'kiwoom'
  if (h.includes('거래일자') && h.includes('거래유형') && h.includes('잔고수량')) return 'mirae'
  if (h.includes('환율') && h.includes('거래대금') && h.includes('단가')) return 'overseas'
  if (h.includes('거래일') && h.includes('종목명') && h.includes('거래구분')) return 'nh'
  return 'unknown'
}

export function parseBrokerCSV(text: string): { trades: Trade[]; broker: string; error?: string } {
  const clean = text.startsWith('\uFEFF') ? text.slice(1) : text
  const lines = clean.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { trades: [], broker: 'unknown', error: '데이터가 없습니다' }

  const headers = parseCSVLine(lines[0]).map(h => h.trim())
  const broker = detectBroker(headers)

  const trades: Trade[] = []

  if (broker === 'kiwoom') {
    // 키움증권: 체결일자, 종목코드, 종목명, 거래구분, 체결수량, 체결단가, 거래금액, 수수료
    const dateIdx = headers.findIndex(h => h.includes('체결일자') || h.includes('거래일자'))
    const codeIdx = headers.findIndex(h => h.includes('종목코드'))
    const nameIdx = headers.findIndex(h => h.includes('종목명'))
    const typeIdx = headers.findIndex(h => h.includes('거래구분') || h.includes('거래유형'))
    const qtyIdx = headers.findIndex(h => h.includes('체결수량') || h.includes('수량'))
    const priceIdx = headers.findIndex(h => h.includes('체결단가') || h.includes('단가'))
    const feeIdx = headers.findIndex(h => h.includes('수수료'))

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]).map(c => c.trim().replace(/,/g, ''))
      const ticker = cells[codeIdx]?.toUpperCase()
      const typeRaw = cells[typeIdx]?.trim()
      const tradeType = TYPE_MAP[typeRaw ?? '']
      if (!ticker || !tradeType) continue
      const dateRaw = cells[dateIdx]?.replace(/\//g, '-').replace(/\./g, '-')
      trades.push({
        id: crypto.randomUUID(),
        ticker,
        name: cells[nameIdx]?.trim() ?? ticker,
        market: /^\d{6}$/.test(ticker) ? 'KRX' : 'US',
        type: tradeType,
        quantity: parseFloat(cells[qtyIdx]?.replace(/[^\d.-]/g, '') ?? '0') || 0,
        price: parseFloat(cells[priceIdx]?.replace(/[^\d.-]/g, '') ?? '0') || 0,
        date: dateRaw?.slice(0, 10) ?? '',
        note: '',
        commission: feeIdx >= 0 ? parseFloat(cells[feeIdx]?.replace(/[^\d.-]/g, '') ?? '0') || undefined : undefined,
        createdAt: new Date().toISOString(),
      })
    }
    return { trades, broker: '키움증권' }
  }

  if (broker === 'mirae') {
    // 미래에셋: 거래일자, 종목코드, 종목명, 거래유형, 수량, 단가, 거래금액, 잔고수량
    const dateIdx = headers.findIndex(h => h.includes('거래일자') || h.includes('거래일'))
    const codeIdx = headers.findIndex(h => h.includes('종목코드'))
    const nameIdx = headers.findIndex(h => h.includes('종목명'))
    const typeIdx = headers.findIndex(h => h.includes('거래유형') || h.includes('거래구분'))
    const qtyIdx = headers.findIndex(h => h.includes('수량') && !h.includes('잔고'))
    const priceIdx = headers.findIndex(h => h.includes('단가') || h.includes('가격'))
    const feeIdx = headers.findIndex(h => h.includes('수수료'))

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]).map(c => c.trim())
      const ticker = cells[codeIdx]?.toUpperCase()
      const typeRaw = cells[typeIdx]?.trim()
      const tradeType = TYPE_MAP[typeRaw ?? '']
      if (!ticker || !tradeType) continue
      const dateRaw = cells[dateIdx]?.replace(/\//g, '-').replace(/\./g, '-')
      trades.push({
        id: crypto.randomUUID(),
        ticker,
        name: cells[nameIdx]?.trim() ?? ticker,
        market: /^\d{6}$/.test(ticker) ? 'KRX' : 'US',
        type: tradeType,
        quantity: parseFloat(cells[qtyIdx]?.replace(/[^\d.-]/g, '') ?? '0') || 0,
        price: parseFloat(cells[priceIdx]?.replace(/[^\d.-]/g, '') ?? '0') || 0,
        date: dateRaw?.slice(0, 10) ?? '',
        note: '',
        commission: feeIdx >= 0 ? parseFloat(cells[feeIdx]?.replace(/[^\d.-]/g, '') ?? '0') || undefined : undefined,
        createdAt: new Date().toISOString(),
      })
    }
    return { trades, broker: '미래에셋' }
  }

  if (broker === 'nh') {
    // NH투자증권: 거래일, 종목명, 거래구분, 수량, 단가, 금액
    const dateIdx = headers.findIndex(h => h === '거래일' || h.includes('거래일'))
    const nameIdx = headers.findIndex(h => h.includes('종목명'))
    const typeIdx = headers.findIndex(h => h.includes('거래구분'))
    const qtyIdx = headers.findIndex(h => h.includes('수량') && !h.includes('잔'))
    const priceIdx = headers.findIndex(h => h === '단가' || h.includes('단가'))
    const feeIdx = headers.findIndex(h => h.includes('수수료'))

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]).map(c => c.trim())
      const name = cells[nameIdx]?.trim()
      const typeRaw = cells[typeIdx]?.trim()
      const tradeType = TYPE_MAP[typeRaw ?? '']
      if (!name || !tradeType) continue
      const ticker = name.replace(/\s+/g, '').toUpperCase().slice(0, 6)
      const dateRaw = cells[dateIdx]?.replace(/\//g, '-').replace(/\./g, '-')
      trades.push({
        id: crypto.randomUUID(),
        ticker,
        name,
        market: 'KRX',
        type: tradeType,
        quantity: parseFloat(cells[qtyIdx]?.replace(/[^\d.-]/g, '') ?? '0') || 0,
        price: parseFloat(cells[priceIdx]?.replace(/[^\d.-]/g, '') ?? '0') || 0,
        date: dateRaw?.slice(0, 10) ?? '',
        note: '',
        commission: feeIdx >= 0 ? parseFloat(cells[feeIdx]?.replace(/[^\d.-]/g, '') ?? '0') || undefined : undefined,
        createdAt: new Date().toISOString(),
      })
    }
    return { trades, broker: 'NH투자증권' }
  }

  if (broker === 'overseas') {
    // 해외주식 형식: 거래일자, 거래구분, 종목명(종목코드), 환율, 거래수량, 거래대금(USD), 단가(USD), 수수료(USD)
    const dateIdx = headers.findIndex(h => h.includes('거래일자') || h.includes('거래일'))
    const typeIdx = headers.findIndex(h => h.includes('거래구분') || h.includes('거래유형'))
    const nameCodeIdx = headers.findIndex(h => h.includes('종목명'))
    const rateIdx = headers.findIndex(h => h === '환율' || h.includes('환율'))
    const qtyIdx = headers.findIndex(h => h.includes('거래수량') || h.includes('수량'))
    const amountIdx = headers.findIndex(h => h.includes('거래대금'))
    const priceIdx = headers.findIndex(h => h.includes('단가'))
    const feeIdx = headers.findIndex(h => h.includes('수수료'))

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]).map(c => c.trim())
      const typeRaw = cells[typeIdx]?.trim()
      const tradeType = TYPE_MAP[typeRaw ?? '']
      if (!tradeType) continue

      // Parse "종목명(ISIN코드)" → name + ISIN
      const nameCode = cells[nameCodeIdx]?.trim() ?? ''
      const isinMatch = nameCode.match(/^(.+?)\(([A-Z0-9]{10,12})\)$/)
      const name = isinMatch ? isinMatch[1].trim() : nameCode
      const isin = isinMatch ? isinMatch[2] : ''
      const mapped = ISIN_TO_TICKER[isin]
      const ticker = mapped?.ticker ?? isin
      const market = mapped?.market ?? 'US'

      const dateRaw = cells[dateIdx]?.replace(/\//g, '-').replace(/\./g, '-')
      const qty = parseFloat(cells[qtyIdx]?.replace(/[^\d.-]/g, '') ?? '0') || 0
      const price = parseFloat(cells[priceIdx]?.replace(/[^\d.-]/g, '') ?? '0') || 0
      const amount = parseFloat(cells[amountIdx]?.replace(/[^\d.-]/g, '') ?? '0') || 0
      const exchangeRate = rateIdx >= 0 ? parseFloat(cells[rateIdx]?.replace(/[^\d.-]/g, '') ?? '0') || undefined : undefined
      const commission = feeIdx >= 0 ? parseFloat(cells[feeIdx]?.replace(/[^\d.-]/g, '') ?? '0') || undefined : undefined

      trades.push({
        id: crypto.randomUUID(),
        ticker,
        name,
        market,
        type: tradeType,
        quantity: tradeType === 'dividend' ? 1 : qty,
        price: tradeType === 'dividend' ? amount : price,
        date: dateRaw?.slice(0, 10) ?? '',
        note: '',
        exchangeRateAtPurchase: exchangeRate,
        commission,
        createdAt: new Date().toISOString(),
      })
    }
    return { trades, broker: '해외주식' }
  }

  return { trades: [], broker: 'unknown', error: '알 수 없는 형식입니다' }
}
