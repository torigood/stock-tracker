import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Trade, Reminder, PinnedNote } from '../types'

interface PortfolioMeta {
  id: string
  name: string
}

interface PortfolioData {
  trades: Trade[]
  targetPrices: Record<string, number>
}

interface PortfolioStore {
  // Multi-portfolio
  portfolios: PortfolioMeta[]
  activePortfolioId: string
  portfolioData: Record<string, PortfolioData>

  // Shortcut to active portfolio (kept in sync)
  trades: Trade[]
  targetPrices: Record<string, number>

  // Global settings
  displayCurrency: 'KRW' | 'USD'
  exchangeRate: number
  exchangeRateOverride: number | null
  manualPrices: Record<string, number>
  sectors: Record<string, string>
  theme: 'dark' | 'light'
  compactNumbers: boolean
  taxRate: number                          // e.g. 0.22 for 22%
  weightAlerts: Record<string, number>     // ticker → max weight %

  // Reminders & pinned notes
  reminders: Reminder[]
  pinnedNotes: PinnedNote[]

  // Portfolio management
  addPortfolio: (name: string) => void
  renamePortfolio: (id: string, name: string) => void
  deletePortfolio: (id: string) => void
  switchPortfolio: (id: string) => void

  // Trade actions
  addTrade: (trade: Omit<Trade, 'id' | 'createdAt'>) => void
  updateTrade: (id: string, updates: Partial<Omit<Trade, 'id' | 'createdAt'>>) => void
  deleteTrade: (id: string) => void
  importTrades: (trades: Trade[]) => void

  // Settings
  setDisplayCurrency: (c: 'KRW' | 'USD') => void
  setExchangeRate: (r: number) => void
  setExchangeRateOverride: (r: number | null) => void
  setTargetPrice: (ticker: string, price: number | null) => void
  setManualPrice: (ticker: string, price: number | null) => void
  setSector: (ticker: string, sector: string) => void
  setTheme: (t: 'dark' | 'light') => void
  toggleCompactNumbers: () => void
  setTaxRate: (r: number) => void
  setWeightAlert: (ticker: string, pct: number | null) => void

  // Reminders
  addReminder: (r: Omit<Reminder, 'id' | 'dismissed'>) => void
  dismissReminder: (id: string) => void
  deleteReminder: (id: string) => void

  // Pinned notes
  addPinnedNote: (text: string, color: PinnedNote['color']) => void
  updatePinnedNote: (id: string, text: string) => void
  deletePinnedNote: (id: string) => void
}

const DEFAULT_ID = 'default'

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      portfolios: [{ id: DEFAULT_ID, name: '기본 포트폴리오' }],
      activePortfolioId: DEFAULT_ID,
      portfolioData: { [DEFAULT_ID]: { trades: [], targetPrices: {} } },
      trades: [],
      targetPrices: {},
      displayCurrency: 'KRW',
      exchangeRate: 1380,
      exchangeRateOverride: null,
      manualPrices: {},
      sectors: {},
      theme: 'dark',
      compactNumbers: false,
      taxRate: 0.22,
      weightAlerts: {},
      reminders: [],
      pinnedNotes: [],

      // ── Portfolio management ────────────────────────────────────────────────

      addPortfolio: (name) =>
        set((state) => {
          const id = crypto.randomUUID()
          return {
            portfolios: [...state.portfolios, { id, name }],
            portfolioData: { ...state.portfolioData, [id]: { trades: [], targetPrices: {} } },
          }
        }),

      renamePortfolio: (id, name) =>
        set((state) => ({
          portfolios: state.portfolios.map((p) => (p.id === id ? { ...p, name } : p)),
        })),

      deletePortfolio: (id) =>
        set((state) => {
          if (state.portfolios.length <= 1) return {}
          const remaining = state.portfolios.filter((p) => p.id !== id)
          const nextId = state.activePortfolioId === id ? remaining[0].id : state.activePortfolioId
          const nextData = state.portfolioData[nextId] ?? { trades: [], targetPrices: {} }
          const newPortfolioData = { ...state.portfolioData }
          delete newPortfolioData[id]
          return {
            portfolios: remaining,
            activePortfolioId: nextId,
            portfolioData: newPortfolioData,
            trades: nextData.trades,
            targetPrices: nextData.targetPrices,
          }
        }),

      switchPortfolio: (id) =>
        set((state) => {
          if (id === state.activePortfolioId) return {}
          const updatedData = {
            ...state.portfolioData,
            [state.activePortfolioId]: { trades: state.trades, targetPrices: state.targetPrices },
          }
          const newData = updatedData[id] ?? { trades: [], targetPrices: {} }
          return {
            portfolioData: updatedData,
            activePortfolioId: id,
            trades: newData.trades,
            targetPrices: newData.targetPrices,
          }
        }),

      // ── Trade actions ───────────────────────────────────────────────────────

      addTrade: (trade) =>
        set((state) => {
          const newTrades = [
            ...state.trades,
            { ...trade, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ]
          return {
            trades: newTrades,
            portfolioData: {
              ...state.portfolioData,
              [state.activePortfolioId]: {
                ...state.portfolioData[state.activePortfolioId],
                trades: newTrades,
              },
            },
          }
        }),

      updateTrade: (id, updates) =>
        set((state) => {
          const newTrades = state.trades.map((t) => (t.id === id ? { ...t, ...updates } : t))
          return {
            trades: newTrades,
            portfolioData: {
              ...state.portfolioData,
              [state.activePortfolioId]: {
                ...state.portfolioData[state.activePortfolioId],
                trades: newTrades,
              },
            },
          }
        }),

      deleteTrade: (id) =>
        set((state) => {
          const newTrades = state.trades.filter((t) => t.id !== id)
          return {
            trades: newTrades,
            portfolioData: {
              ...state.portfolioData,
              [state.activePortfolioId]: {
                ...state.portfolioData[state.activePortfolioId],
                trades: newTrades,
              },
            },
          }
        }),

      importTrades: (trades) =>
        set((state) => ({
          trades,
          portfolioData: {
            ...state.portfolioData,
            [state.activePortfolioId]: {
              ...state.portfolioData[state.activePortfolioId],
              trades,
            },
          },
        })),

      // ── Settings ────────────────────────────────────────────────────────────

      setDisplayCurrency: (c) => set({ displayCurrency: c }),
      setExchangeRate: (r) => set({ exchangeRate: r }),
      setExchangeRateOverride: (r) => set({ exchangeRateOverride: r }),

      setTargetPrice: (ticker, price) =>
        set((state) => {
          const next = { ...state.targetPrices }
          if (price === null) { delete next[ticker] } else { next[ticker] = price }
          return {
            targetPrices: next,
            portfolioData: {
              ...state.portfolioData,
              [state.activePortfolioId]: {
                ...state.portfolioData[state.activePortfolioId],
                targetPrices: next,
              },
            },
          }
        }),

      setManualPrice: (ticker, price) =>
        set((state) => {
          const next = { ...state.manualPrices }
          if (price === null) { delete next[ticker] } else { next[ticker] = price }
          return { manualPrices: next }
        }),

      setSector: (ticker, sector) =>
        set((state) => ({ sectors: { ...state.sectors, [ticker]: sector } })),

      setTheme: (t) => set({ theme: t }),

      toggleCompactNumbers: () => set((state) => ({ compactNumbers: !state.compactNumbers })),

      setTaxRate: (r) => set({ taxRate: r }),

      setWeightAlert: (ticker, pct) =>
        set((state) => {
          const next = { ...state.weightAlerts }
          if (pct === null) { delete next[ticker] } else { next[ticker] = pct }
          return { weightAlerts: next }
        }),

      // ── Reminders ───────────────────────────────────────────────────────────

      addReminder: (r) =>
        set((state) => ({
          reminders: [
            ...state.reminders,
            { ...r, id: crypto.randomUUID(), dismissed: false },
          ],
        })),

      dismissReminder: (id) =>
        set((state) => ({
          reminders: state.reminders.map((r) => (r.id === id ? { ...r, dismissed: true } : r)),
        })),

      deleteReminder: (id) =>
        set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) })),

      // ── Pinned notes ─────────────────────────────────────────────────────────

      addPinnedNote: (text, color) =>
        set((state) => ({
          pinnedNotes: [
            ...state.pinnedNotes,
            { id: crypto.randomUUID(), text, color, createdAt: new Date().toISOString() },
          ],
        })),

      updatePinnedNote: (id, text) =>
        set((state) => ({
          pinnedNotes: state.pinnedNotes.map((n) => (n.id === id ? { ...n, text } : n)),
        })),

      deletePinnedNote: (id) =>
        set((state) => ({ pinnedNotes: state.pinnedNotes.filter((n) => n.id !== id) })),
    }),
    {
      name: 'stock-tracker-v1',
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        const s = persistedState as Record<string, unknown>
        if (version < 2) {
          const id = DEFAULT_ID
          Object.assign(s, {
            portfolios: [{ id, name: '기본 포트폴리오' }],
            activePortfolioId: id,
            portfolioData: {
              [id]: {
                trades: (s.trades as Trade[]) ?? [],
                targetPrices: (s.targetPrices as Record<string, number>) ?? {},
              },
            },
            exchangeRateOverride: null,
            manualPrices: {},
            sectors: {},
          })
        }
        if (version < 3) {
          Object.assign(s, {
            theme: 'dark',
            compactNumbers: false,
            taxRate: 0.22,
            weightAlerts: {},
            reminders: [],
            pinnedNotes: [],
          })
        }
        return s
      },
    }
  )
)
