/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      colors: {
        primary: {
          50: '#f7f7f7',
          100: '#e3e3e3',
          200: '#c8c8c8',
          300: '#a4a4a4',
          400: '#818181',
          500: '#666666',
          600: '#515151',
          700: '#434343',
          800: '#383838',
          900: '#000000',
        },
      },
      animation: {
        'pulse-green': 'pulse-green 0.5s ease-in-out',
        'pulse-red': 'pulse-red 0.5s ease-in-out',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { backgroundColor: 'rgb(34 197 94)' },
          '50%': { backgroundColor: 'rgb(22 163 74)' },
        },
        'pulse-red': {
          '0%, 100%': { backgroundColor: 'rgb(239 68 68)' },
          '50%': { backgroundColor: 'rgb(220 38 38)' },
        },
      },
    },
  },
  plugins: [],
}