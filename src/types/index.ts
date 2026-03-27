export type Market = 'KRX' | 'US' | 'ETF'
export type TradeType = 'buy' | 'sell'

export interface Trade {
  id: string
  ticker: string
  name: string
  market: Market
  type: TradeType
  quantity: number
  price: number
  date: string       // 'YYYY-MM-DD'
  note: string
  createdAt: string  // ISO string
}

export interface Lot {
  price: number
  quantity: number
  date: string
}

export interface Position {
  ticker: string
  name: string
  market: Market
  quantity: number       // remaining shares
  avgPrice: number       // weighted avg of remaining lots
  totalCost: number      // avgPrice * quantity
  currentPrice: number   // fetched from API (0 if unavailable)
  totalValue: number     // currentPrice * quantity
  profitLoss: number     // totalValue - totalCost
  profitLossPercent: number
  dayChange: number      // placeholder, set by price hook
  trades: Trade[]
}

export interface PortfolioSummary {
  totalInvested: number
  totalValue: number
  totalProfitLoss: number
  totalProfitLossPercent: number
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
