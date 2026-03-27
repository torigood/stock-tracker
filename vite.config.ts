import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'StockTracker',
        short_name: 'StockTracker',
        description: '개인 주식 포트폴리오 트래커',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="%230f172a" rx="24"/><polyline points="24,140 72,80 108,110 160,48" fill="none" stroke="%236366f1" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        rewrite: (path) => {
          const url = new URL(`http://localhost${path}`)
          const symbol = url.searchParams.get('symbol') ?? ''
          const period1 = url.searchParams.get('period1')
          const period2 = url.searchParams.get('period2')
          const query = period1 && period2
            ? `interval=1d&period1=${period1}&period2=${period2}`
            : `interval=1d&range=1d`
          return `/v8/finance/chart/${symbol}?${query}`
        },
      },
    },
  },
})
