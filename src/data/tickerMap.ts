import type { TickerEntry } from '../types'

export const TICKER_MAP: TickerEntry[] = [
  // ── KRX ──────────────────────────────────────────────────────────────────
  { ticker: '005930', name: '삼성전자', market: 'KRX' },
  { ticker: '000660', name: 'SK하이닉스', market: 'KRX' },
  { ticker: '035420', name: 'NAVER', market: 'KRX' },
  { ticker: '035720', name: '카카오', market: 'KRX' },
  { ticker: '207940', name: '삼성바이오로직스', market: 'KRX' },
  { ticker: '006400', name: '삼성SDI', market: 'KRX' },
  { ticker: '051910', name: 'LG화학', market: 'KRX' },
  { ticker: '003550', name: 'LG', market: 'KRX' },
  { ticker: '066570', name: 'LG전자', market: 'KRX' },
  { ticker: '028260', name: '삼성물산', market: 'KRX' },
  { ticker: '096770', name: 'SK이노베이션', market: 'KRX' },
  { ticker: '032830', name: '삼성생명', market: 'KRX' },
  { ticker: '055550', name: '신한지주', market: 'KRX' },
  { ticker: '105560', name: 'KB금융', market: 'KRX' },
  { ticker: '316140', name: '우리금융지주', market: 'KRX' },
  { ticker: '086520', name: '에코프로', market: 'KRX' },
  { ticker: '247540', name: '에코프로비엠', market: 'KRX' },
  { ticker: '373220', name: 'LG에너지솔루션', market: 'KRX' },
  { ticker: '000270', name: '기아', market: 'KRX' },
  { ticker: '005380', name: '현대차', market: 'KRX' },
  { ticker: '012330', name: '현대모비스', market: 'KRX' },
  { ticker: '018260', name: '삼성에스디에스', market: 'KRX' },
  { ticker: '034730', name: 'SK', market: 'KRX' },
  { ticker: '011200', name: 'HMM', market: 'KRX' },
  { ticker: '003490', name: '대한항공', market: 'KRX' },
  // ── US ───────────────────────────────────────────────────────────────────
  { ticker: 'AAPL', name: 'Apple Inc.', market: 'US' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', market: 'US' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', market: 'US' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', market: 'US' },
  { ticker: 'GOOGL', name: 'Alphabet Inc. (Class A)', market: 'US' },
  { ticker: 'META', name: 'Meta Platforms Inc.', market: 'US' },
  { ticker: 'TSLA', name: 'Tesla Inc.', market: 'US' },
  { ticker: 'AVGO', name: 'Broadcom Inc.', market: 'US' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', market: 'US' },
  { ticker: 'V', name: 'Visa Inc.', market: 'US' },
  { ticker: 'MA', name: 'Mastercard Inc.', market: 'US' },
  { ticker: 'UNH', name: 'UnitedHealth Group', market: 'US' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', market: 'US' },
  { ticker: 'WMT', name: 'Walmart Inc.', market: 'US' },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', market: 'US' },
  { ticker: 'PLTR', name: 'Palantir Technologies', market: 'US' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', market: 'US' },
  { ticker: 'INTC', name: 'Intel Corp.', market: 'US' },
  { ticker: 'CRM', name: 'Salesforce Inc.', market: 'US' },
  { ticker: 'ORCL', name: 'Oracle Corp.', market: 'US' },
  { ticker: 'NFLX', name: 'Netflix Inc.', market: 'US' },
  { ticker: 'DIS', name: 'Walt Disney Co.', market: 'US' },
  { ticker: 'COIN', name: 'Coinbase Global', market: 'US' },
  { ticker: 'MSTR', name: 'MicroStrategy Inc.', market: 'US' },
  // ── ETF ──────────────────────────────────────────────────────────────────
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', market: 'ETF' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', market: 'ETF' },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', market: 'ETF' },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', market: 'ETF' },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', market: 'ETF' },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', market: 'ETF' },
  { ticker: 'SCHD', name: 'Schwab US Dividend Equity ETF', market: 'ETF' },
  { ticker: 'GLD', name: 'SPDR Gold Trust', market: 'ETF' },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', market: 'ETF' },
  { ticker: 'SOXL', name: 'Direxion Daily Semiconductor Bull 3X', market: 'ETF' },
  { ticker: '069500', name: 'KODEX 200', market: 'ETF' },
  { ticker: '102110', name: 'TIGER 200', market: 'ETF' },
  { ticker: '360750', name: 'TIGER 미국S&P500', market: 'ETF' },
  { ticker: '133690', name: 'TIGER 미국나스닥100', market: 'ETF' },
  { ticker: '148070', name: 'KOSEF 국고채10년', market: 'ETF' },
  { ticker: '114800', name: 'KODEX 인버스', market: 'ETF' },
  { ticker: '252670', name: 'KODEX 200선물인버스2X', market: 'ETF' },
]

export function searchTickers(query: string): TickerEntry[] {
  if (!query || query.length < 1) return []
  const q = query.toLowerCase()
  return TICKER_MAP.filter(
    (e) =>
      e.ticker.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q)
  ).slice(0, 8)
}
