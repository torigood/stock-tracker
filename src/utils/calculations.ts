import type { Trade, Position, Lot, PortfolioSummary, Market } from '../types'

// ── Currency helpers ────────────────────────────────────────────────────────

export function getBaseCurrency(market: Market, ticker: string): 'KRW' | 'USD' {
  if (market === 'KRX') return 'KRW'
  if (market === 'US') return 'USD'
  // ETF: all-digit ticker → KRW, otherwise USD
  return /^\d+$/.test(ticker) ? 'KRW' : 'USD'
}

export function convertToDisplay(
  amount: number,
  base: 'KRW' | 'USD',
  display: 'KRW' | 'USD',
  rate: number
): number {
  if (base === display) return amount
  if (base === 'USD' && display === 'KRW') return amount * rate
  // base === 'KRW' && display === 'USD'
  return amount / rate
}

// ── Realized P&L ─────────────────────────────────────────────────────────────

export interface RealizedRecord {
  ticker: string
  market: Market
  baseCurrency: 'KRW' | 'USD'
  realizedPL: number  // in native currency (includes dividends)
  dividendTotal: number
}

export function computeRealizedPL(trades: Trade[]): RealizedRecord[] {
  const tradesByTicker = new Map<string, Trade[]>()
  for (const trade of trades) {
    const list = tradesByTicker.get(trade.ticker) ?? []
    list.push(trade)
    tradesByTicker.set(trade.ticker, list)
  }

  const records: RealizedRecord[] = []

  for (const [ticker, tickerTrades] of tradesByTicker) {
    const sorted = [...tickerTrades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const meta = sorted[sorted.length - 1]
    const baseCurrency = getBaseCurrency(meta.market, ticker)
    const lots: Lot[] = []
    let realizedPL = 0
    let dividendTotal = 0
    let hasActivity = false

    for (const trade of sorted) {
      if (trade.type === 'buy') {
        lots.push({ price: trade.price, quantity: trade.quantity, date: trade.date })
      } else if (trade.type === 'sell') {
        hasActivity = true
        let remaining = trade.quantity
        while (remaining > 0 && lots.length > 0) {
          const lot = lots[0]
          const consumed = Math.min(lot.quantity, remaining)
          realizedPL += (trade.price - lot.price) * consumed
          remaining -= consumed
          if (lot.quantity <= consumed) {
            lots.shift()
          } else {
            lot.quantity -= consumed
          }
        }
      } else if (trade.type === 'dividend') {
        // Dividend amount stored in price field
        dividendTotal += trade.price
        realizedPL += trade.price
        hasActivity = true
      } else if (trade.type === 'split') {
        // Apply split ratio to all existing lots
        const ratio = trade.quantity
        if (ratio > 0) {
          for (const lot of lots) {
            lot.quantity *= ratio
            lot.price /= ratio
          }
        }
      }
    }

    if (hasActivity) {
      records.push({ ticker, market: meta.market, baseCurrency, realizedPL, dividendTotal })
    }
  }

  return records
}

// ── Portfolio history ─────────────────────────────────────────────────────────

export function computePortfolioHistory(
  trades: Trade[],
  displayCurrency: 'KRW' | 'USD',
  exchangeRate: number
): { date: string; invested: number }[] {
  if (trades.length === 0) return []

  // Only count buy/sell for investment history (skip dividend and split)
  const investmentTrades = trades.filter((t) => t.type === 'buy' || t.type === 'sell')
  if (investmentTrades.length === 0) return []

  const sorted = [...investmentTrades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const byDate = new Map<string, number>()
  for (const trade of sorted) {
    const base = getBaseCurrency(trade.market, trade.ticker)
    const amount = trade.quantity * trade.price
    const displayAmount = convertToDisplay(amount, base, displayCurrency, exchangeRate)
    const delta = trade.type === 'buy' ? displayAmount : -displayAmount
    byDate.set(trade.date, (byDate.get(trade.date) ?? 0) + delta)
  }

  const dates = [...byDate.keys()].sort()
  const result: { date: string; invested: number }[] = []
  let cumulative = 0
  for (const date of dates) {
    cumulative += byDate.get(date) ?? 0
    result.push({ date, invested: cumulative })
  }

  return result
}

// ── Position calculation ──────────────────────────────────────────────────────

/**
 * Calculate positions from trades using FIFO method.
 * Handles buy/sell/split/dividend trades.
 * Returns only positions with remaining quantity > 0.
 */
export function computePositions(trades: Trade[], fallbackExchangeRate = 1380): Position[] {
  if (trades.length === 0) return []

  // Group trades by ticker
  const tradesByTicker = new Map<string, Trade[]>()
  for (const trade of trades) {
    const list = tradesByTicker.get(trade.ticker) ?? []
    list.push(trade)
    tradesByTicker.set(trade.ticker, list)
  }

  const positions: Position[] = []

  for (const [ticker, tickerTrades] of tradesByTicker) {
    // Sort chronologically for FIFO
    const sorted = [...tickerTrades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const meta = sorted[sorted.length - 1] // latest trade for name/market
    const lots: Lot[] = []
    let dividendTotal = 0

    for (const trade of sorted) {
      if (trade.type === 'buy') {
        lots.push({
          price: trade.price,
          quantity: trade.quantity,
          date: trade.date,
          exchangeRate: trade.exchangeRateAtPurchase,
        })
      } else if (trade.type === 'sell') {
        // FIFO sell
        let remaining = trade.quantity
        while (remaining > 0 && lots.length > 0) {
          const lot = lots[0]
          if (lot.quantity <= remaining) {
            remaining -= lot.quantity
            lots.shift()
          } else {
            lot.quantity -= remaining
            remaining = 0
          }
        }
      } else if (trade.type === 'split') {
        // Apply split ratio to all existing lots
        const ratio = trade.quantity
        if (ratio > 0) {
          for (const lot of lots) {
            lot.quantity *= ratio
            lot.price /= ratio
          }
        }
      } else if (trade.type === 'dividend') {
        dividendTotal += trade.price
      }
    }

    const totalQuantity = lots.reduce((sum, l) => sum + l.quantity, 0)
    if (totalQuantity <= 0) continue

    const totalCostBasis = lots.reduce((sum, l) => sum + l.price * l.quantity, 0)
    const avgPrice = totalCostBasis / totalQuantity
    const baseCurrency = getBaseCurrency(meta.market, ticker)

    // KRW cost basis: for USD stocks, use purchase exchange rates
    const totalCostKRW = baseCurrency === 'USD'
      ? lots.reduce((sum, l) => sum + l.price * l.quantity * (l.exchangeRate ?? fallbackExchangeRate), 0)
      : totalCostBasis  // KRX: already KRW
    const avgPriceKRW = totalQuantity > 0 ? totalCostKRW / totalQuantity : 0

    positions.push({
      ticker,
      name: meta.name,
      market: meta.market,
      baseCurrency,
      quantity: totalQuantity,
      avgPrice,
      avgPriceKRW,
      totalCost: totalCostBasis,
      totalCostKRW,
      currentPrice: 0,
      totalValue: 0,
      totalValueKRW: 0,
      profitLoss: 0,
      profitLossPercent: 0,
      profitLossKRW: 0,
      profitLossPercentKRW: 0,
      dayChange: 0,
      dividendTotal,
      trades: tickerTrades,
    })
  }

  return positions.sort((a, b) => b.totalCost - a.totalCost)
}

/**
 * Merge current prices into positions and compute P&L (both native and KRW-based).
 */
export function applyPrices(
  positions: Position[],
  prices: Map<string, number>,
  currentExchangeRate?: number
): Position[] {
  return positions.map((pos) => {
    const currentPrice = prices.get(pos.ticker) ?? 0

    // Native-currency P&L
    const totalValue = currentPrice > 0 ? currentPrice * pos.quantity : 0
    const profitLoss = currentPrice > 0 ? totalValue - pos.totalCost : 0
    const profitLossPercent =
      currentPrice > 0 && pos.totalCost > 0 ? (profitLoss / pos.totalCost) * 100 : 0

    // KRW-based P&L (accounts for exchange rate change since purchase)
    let totalValueKRW = 0
    let profitLossKRW = 0
    let profitLossPercentKRW = 0

    if (currentPrice > 0) {
      if (pos.baseCurrency === 'USD' && currentExchangeRate) {
        totalValueKRW = currentPrice * pos.quantity * currentExchangeRate
        profitLossKRW = totalValueKRW - pos.totalCostKRW
        profitLossPercentKRW = pos.totalCostKRW > 0 ? (profitLossKRW / pos.totalCostKRW) * 100 : 0
      } else {
        // KRX: no FX difference
        totalValueKRW = totalValue
        profitLossKRW = profitLoss
        profitLossPercentKRW = profitLossPercent
      }
    }

    return { ...pos, currentPrice, totalValue, totalValueKRW, profitLoss, profitLossPercent, profitLossKRW, profitLossPercentKRW }
  })
}

/**
 * Compute portfolio-level summary in the target display currency.
 * Correctly handles mixed KRW/USD portfolios.
 */
export function computeSummary(
  positions: Position[],
  displayCurrency: 'KRW' | 'USD',
  exchangeRate: number,
  totalRealizedPL?: number
): PortfolioSummary {
  let totalInvested = 0
  let totalValue = 0

  for (const p of positions) {
    if (displayCurrency === 'KRW') {
      if (p.baseCurrency === 'USD') {
        totalInvested += p.totalCostKRW
        totalValue += p.totalValueKRW > 0 ? p.totalValueKRW : p.totalCostKRW
      } else {
        totalInvested += p.totalCost
        totalValue += p.totalValue > 0 ? p.totalValue : p.totalCost
      }
    } else {
      // USD display
      if (p.baseCurrency === 'USD') {
        totalInvested += p.totalCost
        totalValue += p.totalValue > 0 ? p.totalValue : p.totalCost
      } else {
        // KRX → convert to USD
        totalInvested += p.totalCost / exchangeRate
        totalValue += (p.totalValue > 0 ? p.totalValue : p.totalCost) / exchangeRate
      }
    }
  }

  const totalProfitLoss = totalValue - totalInvested
  const totalProfitLossPercent =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0

  return {
    totalInvested,
    totalValue,
    totalProfitLoss,
    totalProfitLossPercent,
    totalRealizedPL: totalRealizedPL ?? 0,
    positions,
  }
}

// ── Formatting helpers ─────────────────────────────────────────────────────

export function formatPrice(price: number, market: Market): string {
  if (price === 0) return '–'
  if (market === 'KRX' || (market === 'ETF' && price > 1000)) {
    return '₩' + Math.round(price).toLocaleString('ko-KR')
  }
  return (
    '$' +
    price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

export function formatCurrency(amount: number, market: Market): string {
  if (market === 'KRX') {
    const abs = Math.abs(Math.round(amount))
    return (amount < 0 ? '-₩' : '₩') + abs.toLocaleString('ko-KR')
  }
  const abs = Math.abs(amount)
  return (
    (amount < 0 ? '-$' : '$') +
    abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}
