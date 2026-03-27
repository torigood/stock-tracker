import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Trade } from '../types'

interface PortfolioStore {
  trades: Trade[]
  displayCurrency: 'KRW' | 'USD'
  exchangeRate: number
  targetPrices: Record<string, number>
  addTrade: (trade: Omit<Trade, 'id' | 'createdAt'>) => void
  updateTrade: (id: string, updates: Partial<Omit<Trade, 'id' | 'createdAt'>>) => void
  deleteTrade: (id: string) => void
  importTrades: (trades: Trade[]) => void
  setDisplayCurrency: (c: 'KRW' | 'USD') => void
  setExchangeRate: (r: number) => void
  setTargetPrice: (ticker: string, price: number | null) => void
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      trades: [],
      displayCurrency: 'KRW',
      exchangeRate: 1380,
      targetPrices: {},

      addTrade: (trade) =>
        set((state) => ({
          trades: [
            ...state.trades,
            {
              ...trade,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateTrade: (id, updates) =>
        set((state) => ({
          trades: state.trades.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTrade: (id) =>
        set((state) => ({
          trades: state.trades.filter((t) => t.id !== id),
        })),

      importTrades: (trades) => set({ trades }),

      setDisplayCurrency: (c) => set({ displayCurrency: c }),

      setExchangeRate: (r) => set({ exchangeRate: r }),

      setTargetPrice: (ticker, price) =>
        set((state) => {
          const next = { ...state.targetPrices }
          if (price === null) {
            delete next[ticker]
          } else {
            next[ticker] = price
          }
          return { targetPrices: next }
        }),
    }),
    { name: 'stock-tracker-v1' }
  )
)
