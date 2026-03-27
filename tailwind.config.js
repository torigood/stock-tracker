/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: 'var(--s950)',
          900: 'var(--s900)',
          800: 'var(--s800)',
          700: 'var(--s700)',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
