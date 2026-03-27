import type { Trade, Position, Lot, PortfolioSummary, Market } from '../types'

/**
 * Calculate positions from trades using FIFO method.
 * Returns only positions with remaining quantity > 0.
 */
export function computePositions(trades: Trade[]): Position[] {
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

    for (const trade of sorted) {
      if (trade.type === 'buy') {
        lots.push({ price: trade.price, quantity: trade.quantity, date: trade.date })
      } else {
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
      }
    }

    const totalQuantity = lots.reduce((sum, l) => sum + l.quantity, 0)
    if (totalQuantity <= 0) continue

    const totalCostBasis = lots.reduce((sum, l) => sum + l.price * l.quantity, 0)
    const avgPrice = totalCostBasis / totalQuantity

    positions.push({
      ticker,
      name: meta.name,
      market: meta.market,
      quantity: totalQuantity,
      avgPrice,
      totalCost: totalCostBasis,
      currentPrice: 0,
      totalValue: 0,
      profitLoss: 0,
      profitLossPercent: 0,
      dayChange: 0,
      trades: tickerTrades,
    })
  }

  return positions.sort((a, b) => b.totalCost - a.totalCost)
}

/**
 * Merge current prices into positions and compute P&L.
 */
export function applyPrices(
  positions: Position[],
  prices: Map<string, number>
): Position[] {
  return positions.map((pos) => {
    const currentPrice = prices.get(pos.ticker) ?? 0
    const totalValue = currentPrice > 0 ? currentPrice * pos.quantity : 0
    const profitLoss = currentPrice > 0 ? totalValue - pos.totalCost : 0
    const profitLossPercent =
      currentPrice > 0 && pos.totalCost > 0
        ? (profitLoss / pos.totalCost) * 100
        : 0

    return { ...pos, currentPrice, totalValue, profitLoss, profitLossPercent }
  })
}

/**
 * Compute portfolio-level summary.
 */
export function computeSummary(positions: Position[]): PortfolioSummary {
  const totalInvested = positions.reduce((s, p) => s + p.totalCost, 0)
  const totalValue = positions.reduce((s, p) => s + (p.totalValue || p.totalCost), 0)
  const totalProfitLoss = totalValue - totalInvested
  const totalProfitLossPercent =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0

  return { totalInvested, totalValue, totalProfitLoss, totalProfitLossPercent, positions }
}

// ── Formatting helpers ─────────────────────────────────────────────────────

export function formatPrice(price: number, market: Market): string {
  if (price === 0) return '–'
  if (market === 'KRX' || market === 'ETF' && price > 1000) {
    // Assume KRW for high-value numbers
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
