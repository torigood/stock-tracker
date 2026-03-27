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
