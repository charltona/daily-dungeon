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
      }
    },
  },
  plugins: [],
}
