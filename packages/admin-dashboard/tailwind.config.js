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
        app: {
          bg: 'var(--app-bg)',
          fg: 'var(--app-fg)',
          card: 'var(--app-card)',
          border: 'var(--app-border)',
          muted: 'var(--app-muted)',
          accent: 'var(--app-accent)',
        },
        primary: {
          50: '#e8f5f0',
          100: '#d1ebe1',
          200: '#a3d7c3',
          300: '#75c3a5',
          400: '#47af87',
          500: '#295B4D',
          600: '#204a3e',
          700: '#18382f',
          800: '#10271f',
          900: '#081510',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

