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
        /* ═══ App Design System (primary) ═══ */
        app: {
          bg: 'var(--app-bg)',
          fg: 'var(--app-fg)',
          surface: 'var(--app-surface)',
          card: 'var(--app-card)',
          border: 'var(--app-border)',
          muted: 'var(--app-muted)',
          accent: 'var(--app-accent)',
          'accent-hover': 'var(--app-accent-hover)',
          secondary: 'var(--app-secondary)',
          tertiary: 'var(--app-tertiary)',
          success: 'var(--app-success)',
          warning: 'var(--app-warning)',
          error: 'var(--app-error)',
          info: 'var(--app-info)',
        },
        /* ═══ Backward-compat (old tokens still work) ═══ */
        foreground: 'var(--foreground)',
        background: 'var(--background)',
        card: 'var(--card)',
        border: 'var(--border)',
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          foreground: 'var(--warning-foreground)',
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
      boxShadow: {
        soft: 'var(--shadow-soft)',
        medium: 'var(--shadow-medium)',
        strong: 'var(--shadow-strong)',
        glow: 'var(--shadow-glow)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

