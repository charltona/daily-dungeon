/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dungeon: {
          darkest: '#0a0b10',
          darker: '#12141e',
          card: '#1a1d2c',
          border: '#2a2f45',
          gold: '#f59e0b',
          crimson: '#ef4444',
          holy: '#60a5fa',
          shadow: '#a855f7',
        }
      },
      keyframes: {
        'float-combat': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.6)' },
          '15%': { opacity: '1', transform: 'translateY(-4px) scale(1.25)' },
          '35%': { transform: 'translateY(-12px) scale(1.0)' },
          '75%': { opacity: '1', transform: 'translateY(-30px) scale(0.95)' },
          '100%': { opacity: '0', transform: 'translateY(-46px) scale(0.85)' },
        },
        'damage-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px) rotate(-0.5deg)' },
          '40%': { transform: 'translateX(4px) rotate(0.5deg)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(2px)' },
        },
        'heal-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
          '50%': { boxShadow: '0 0 16px 2px rgba(16, 185, 129, 0.6)' },
        },
      },
      animation: {
        'float-combat': 'float-combat 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        'damage-shake': 'damage-shake 0.35s ease-in-out',
        'heal-pulse': 'heal-pulse 0.5s ease-out',
      },
    },
  },
  plugins: [],
}
