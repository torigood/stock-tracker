export type Market = 'KRX' | 'US' | 'ETF'
export type TradeType = 'buy' | 'sell' | 'dividend' | 'split'

export interface Trade {
  id: string
  ticker: string
  name: string
  market: Market
  type: TradeType
  quantity: number      // split: ratio (e.g. 2 for 2:1); dividend: 1
  price: number         // dividend: total received; split: 0
  date: string          // 'YYYY-MM-DD'
  note: string
  createdAt: string     // ISO string
  exchangeRateAtPurchase?: number // USD/KRW rate at trade time (US stocks only)
  commission?: number   // trading fee in native currency (added to cost basis for buys, deducted from proceeds for sells)
}

export interface Lot {
  price: number
  quantity: number
  date: string
  exchangeRate?: number  // rate at purchase time (for KRW P&L calc)
}

export interface Position {
  ticker: string
  name: string
  market: Market
  baseCurrency: 'KRW' | 'USD'
  quantity: number
  avgPrice: number       // weighted avg in native currency (USD for US stocks)
  avgPriceKRW: number    // weighted avg in KRW (uses purchase exchange rates)
  totalCost: number      // in native currency
  totalCostKRW: number   // in KRW (using purchase exchange rates)
  currentPrice: number   // in native currency (0 if unavailable)
  totalValue: number     // currentPrice × qty (native)
  totalValueKRW: number  // currentPrice × qty × currentExchangeRate
  profitLoss: number     // native-currency P&L
  profitLossPercent: number
  profitLossKRW: number        // KRW-based P&L (accounts for FX change)
  profitLossPercentKRW: number // KRW-based return %
  dayChange: number
  trades: Trade[]
  dividendTotal: number  // total dividends received (in native currency)
}

export interface PortfolioSummary {
  totalInvested: number
  totalValue: number
  totalProfitLoss: number
  totalProfitLossPercent: number
  totalRealizedPL: number
  positions: Position[]
}

export interface PriceCache {
  price: number
  timestamp: number
}

export interface TickerEntry {
  ticker: string
  name: string
  market: Market
}

export interface Reminder {
  id: string
  text: string
  date: string       // YYYY-MM-DD — when to show
  ticker?: string
  dismissed: boolean
}

export interface PinnedNote {
  id: string
  text: string
  color: 'yellow' | 'green' | 'blue' | 'purple'
  createdAt: string
}

export interface PortfolioSnapshot {
  date: string      // 'YYYY-MM-DD'
  valueKRW: number  // total portfolio value in KRW at snapshot time
  costKRW: number   // total cost basis in KRW at snapshot time
}
