import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Trade } from '../types'

interface PortfolioStore {
  trades: Trade[]
  addTrade: (trade: Omit<Trade, 'id' | 'createdAt'>) => void
  updateTrade: (id: string, updates: Partial<Omit<Trade, 'id' | 'createdAt'>>) => void
  deleteTrade: (id: string) => void
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      trades: [],

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
    }),
    { name: 'stock-tracker-v1' }
  )
)
