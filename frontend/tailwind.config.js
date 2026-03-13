/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chart-bg': '#131722',
        'panel-bg': '#1e222d',
        'border': '#2a2e39',
        'text-primary': '#d1d4dc',
        'text-secondary': '#787b86',
        'green': '#26a69a',
        'red': '#ef5350',
        'blue': '#2962ff',
      }
    },
  },
  plugins: [],
}
