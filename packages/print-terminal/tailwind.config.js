/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#295B4D',
          600: '#1e4a3d',
          700: '#15362d',
          800: '#0d231e',
          900: '#06110f',
        },
      },
    },
  },
  plugins: [],
}
