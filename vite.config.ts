import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        rewrite: (path) => {
          const url = new URL(`http://localhost${path}`)
          const symbol = encodeURIComponent(url.searchParams.get('symbol') ?? '')
          const period1  = url.searchParams.get('period1')
          const period2  = url.searchParams.get('period2')
          const range    = url.searchParams.get('range') ?? '1d'
          const interval = url.searchParams.get('interval') ?? '1d'
          const query = period1 && period2
            ? `interval=${interval}&period1=${period1}&period2=${period2}`
            : `interval=${interval}&range=${range}`
          return `/v8/finance/chart/${symbol}?${query}`
        },
      },
    },
  },
})
