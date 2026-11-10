import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07090b', card: '#101418', line: '#222a31', lime: '#C6F000', bone: '#f2f0e8',
        ladies: '#f472b6', high: '#60a5fa', low: '#4ade80',
      },
      fontFamily: { display: ['var(--font-display)', 'Impact', 'sans-serif'], sans: ['var(--font-body)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
