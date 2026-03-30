import type { Trade } from '../types'

type BrokerFormat = 'kiwoom' | 'mirae' | 'nh' | 'unknown'

const TYPE_MAP: Record<string, Trade['type']> = {
  '매수': 'buy', '매도': 'sell', '배당': 'dividend', '분할': 'split',
  'buy': 'buy', 'sell': 'sell', 'dividend': 'dividend', 'split': 'split',
  '현금배당': 'dividend', '주식매수': 'buy', '주식매도': 'sell',
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

  return { trades: [], broker: 'unknown', error: '알 수 없는 형식입니다' }
}
