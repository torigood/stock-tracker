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

export function computeRealizedPL(trades: Trade[], method: 'fifo' | 'average' = 'fifo'): RealizedRecord[] {
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
    let realizedPL = 0
    let dividendTotal = 0
    let hasActivity = false

    if (method === 'average') {
      let runningCost = 0
      let runningQty = 0

      for (const trade of sorted) {
        if (trade.type === 'buy') {
          const commissionTotal = trade.commission ?? 0
          runningCost += trade.price * trade.quantity + commissionTotal
          runningQty += trade.quantity
        } else if (trade.type === 'sell') {
          hasActivity = true
          const avgCost = runningQty > 0 ? runningCost / runningQty : 0
          const effectiveSellPrice = trade.price - (trade.commission != null && trade.quantity > 0
            ? trade.commission / trade.quantity
            : 0)
          realizedPL += (effectiveSellPrice - avgCost) * trade.quantity
          runningCost -= avgCost * trade.quantity
          runningQty -= trade.quantity
          if (runningQty < 0) runningQty = 0
          if (runningCost < 0) runningCost = 0
        } else if (trade.type === 'dividend') {
          dividendTotal += trade.price
          realizedPL += trade.price
          hasActivity = true
        } else if (trade.type === 'split') {
          const ratio = trade.quantity
          if (ratio > 0) {
            runningQty *= ratio
            // cost stays same
          }
        }
      }
    } else {
      // FIFO
      const lots: Lot[] = []

      for (const trade of sorted) {
        if (trade.type === 'buy') {
          // Include commission in cost basis (per-share)
          const commissionPerShare = trade.commission != null && trade.quantity > 0
            ? trade.commission / trade.quantity
            : 0
          lots.push({ price: trade.price + commissionPerShare, quantity: trade.quantity, date: trade.date })
        } else if (trade.type === 'sell') {
          hasActivity = true
          // Deduct sell commission from effective sell price
          const effectiveSellPrice = trade.price - (trade.commission != null && trade.quantity > 0
            ? trade.commission / trade.quantity
            : 0)
          let remaining = trade.quantity
          while (remaining > 0 && lots.length > 0) {
            const lot = lots[0]
            const consumed = Math.min(lot.quantity, remaining)
            realizedPL += (effectiveSellPrice - lot.price) * consumed
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
 * Calculate positions from trades using FIFO or Average Cost method.
 * Handles buy/sell/split/dividend trades.
 * Returns only positions with remaining quantity > 0.
 */
export function computePositions(
  trades: Trade[],
  fallbackExchangeRate = 1380,
  method: 'fifo' | 'average' = 'fifo'
): Position[] {
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
    // Sort chronologically
    const sorted = [...tickerTrades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const meta = sorted[sorted.length - 1] // latest trade for name/market
    const baseCurrency = getBaseCurrency(meta.market, ticker)
    let dividendTotal = 0

    if (method === 'average') {
      let runningCost = 0
      let runningQty = 0
      let runningCostKRW = 0

      for (const trade of sorted) {
        if (trade.type === 'buy') {
          const commissionTotal = trade.commission ?? 0
          runningCost += trade.price * trade.quantity + commissionTotal
          runningQty += trade.quantity
          if (baseCurrency === 'USD') {
            const rate = trade.exchangeRateAtPurchase ?? fallbackExchangeRate
            runningCostKRW += (trade.price * trade.quantity + commissionTotal) * rate
          } else {
            runningCostKRW += trade.price * trade.quantity + commissionTotal
          }
        } else if (trade.type === 'sell') {
          const avgCost = runningQty > 0 ? runningCost / runningQty : 0
          const avgCostKRW = runningQty > 0 ? runningCostKRW / runningQty : 0
          runningCost -= avgCost * trade.quantity
          runningCostKRW -= avgCostKRW * trade.quantity
          runningQty -= trade.quantity
          if (runningQty < 0) runningQty = 0
          if (runningCost < 0) runningCost = 0
          if (runningCostKRW < 0) runningCostKRW = 0
        } else if (trade.type === 'split') {
          const ratio = trade.quantity
          if (ratio > 0) {
            runningQty *= ratio
            // cost stays same
          }
        } else if (trade.type === 'dividend') {
          dividendTotal += trade.price
        }
      }

      if (runningQty <= 0) continue

      const totalCostBasis = runningCost
      const avgPrice = runningQty > 0 ? totalCostBasis / runningQty : 0
      const totalCostKRW = baseCurrency === 'USD' ? runningCostKRW : totalCostBasis
      const avgPriceKRW = runningQty > 0 ? totalCostKRW / runningQty : 0

      positions.push({
        ticker,
        name: meta.name,
        market: meta.market,
        baseCurrency,
        quantity: runningQty,
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
    } else {
      // FIFO
      const lots: Lot[] = []

      for (const trade of sorted) {
        if (trade.type === 'buy') {
          // Include commission in cost basis (per-share)
          const commissionPerShare = trade.commission != null && trade.quantity > 0
            ? trade.commission / trade.quantity
            : 0
          lots.push({
            price: trade.price + commissionPerShare,
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

// ── Performance metrics ───────────────────────────────────────────────────

export function computeCAGR(
  totalInvested: number,
  totalValue: number,
  holdingDays: number
): number | null {
  if (totalInvested <= 0 || totalValue <= 0 || holdingDays <= 0) return null
  const years = holdingDays / 365
  if (years < 0.5) return null // Not meaningful for very short periods
  return (Math.pow(totalValue / totalInvested, 1 / years) - 1) * 100
}

export function computeYOC(
  trades: Trade[],
  positions: Position[],
  displayCurrency: 'KRW' | 'USD',
  exchangeRate: number
): number | null {
  // Get dividends from last 12 months
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 1)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  let dividendTotal = 0
  for (const trade of trades) {
    if (trade.type !== 'dividend') continue
    if (trade.date < cutoffStr) continue
    const base = getBaseCurrency(trade.market, trade.ticker)
    dividendTotal += convertToDisplay(trade.price, base, displayCurrency, exchangeRate)
  }

  if (dividendTotal === 0) return null

  // Total cost in display currency
  const totalCost = positions.reduce((sum, p) => {
    if (displayCurrency === 'KRW') {
      return sum + (p.baseCurrency === 'USD' ? p.totalCostKRW : p.totalCost)
    }
    return sum + (p.baseCurrency === 'USD' ? p.totalCost : p.totalCost / exchangeRate)
  }, 0)

  if (totalCost === 0) return null
  return (dividendTotal / totalCost) * 100
}

export function computeMDD(snapshots: import('../types').PortfolioSnapshot[]): number | null {
  if (snapshots.length < 10) return null
  let peak = snapshots[0].valueKRW
  let maxDD = 0
  for (const s of snapshots) {
    if (s.valueKRW > peak) peak = s.valueKRW
    if (peak > 0) {
      const dd = (peak - s.valueKRW) / peak
      if (dd > maxDD) maxDD = dd
    }
  }
  return maxDD * 100
}

export function computeSharpe(
  snapshots: import('../types').PortfolioSnapshot[],
  riskFreeRate: number
): number | null {
  if (snapshots.length < 30) return null
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
  const returns: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].valueKRW
    if (prev > 0) returns.push((sorted[i].valueKRW - prev) / prev)
  }
  if (returns.length < 20) return null
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  if (stdDev === 0) return null
  const annualizedReturn = Math.pow(1 + mean, 252) - 1
  const annualizedStdDev = stdDev * Math.sqrt(252)
  return (annualizedReturn - riskFreeRate) / annualizedStdDev
}
