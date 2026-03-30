import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      external: [],
    },
    commonjsOptions: {
      include: [/react-is/, /node_modules/],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'StockTracker',
        short_name: 'StockTracker',
        description: '주식 포트폴리오 추적기',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 },
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
          const symbol = encodeURIComponent(url.searchParams.get('symbol') ?? '')
          const period1 = url.searchParams.get('period1')
          const period2 = url.searchParams.get('period2')
          const range = url.searchParams.get('range') ?? '1d'
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
