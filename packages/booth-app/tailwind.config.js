/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../frontend/src/components/workflow-runtime/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'booth-bg': '#0a0a0a',
        'booth-card': '#1a1a1a',
        'booth-border': '#2a2a2a',
        'booth-accent': '#6366f1',
        'booth-fg': '#fafafa',
        'booth-muted': '#737373',
      },
    },
  },
  plugins: [],
};
