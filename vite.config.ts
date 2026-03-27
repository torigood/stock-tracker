import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 개발 환경: /api/yahoo?symbol=AAPL → Yahoo Finance v8 API
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        rewrite: (path) => {
          const url = new URL(`http://localhost${path}`)
          const symbol = url.searchParams.get('symbol') ?? ''
          return `/v8/finance/chart/${symbol}?interval=1d&range=1d`
        },
      },
    },
  },
})
