/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f5f0',
          100: '#d1ebe1',
          200: '#a3d7c3',
          300: '#75c3a5',
          400: '#47af87',
          500: '#295B4D', // Hauptfarbe aus alter App
          600: '#204a3e',
          700: '#18382f',
          800: '#10271f',
          900: '#081510',
        },
        brand: {
          green: '#295B4D',
          light: '#e8f5f0',
          dark: '#18382f',
        },
      },
    },
  },
  plugins: [],
}

