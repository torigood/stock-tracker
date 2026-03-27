/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#060912',
          900: '#0d1117',
          800: '#161b22',
          700: '#21262d',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
