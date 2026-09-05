/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Semantic tokens are defined as custom properties in src/index.css.
      colors: {
        paper: 'var(--paper)',
        surface: {
          DEFAULT: 'var(--surface)',
          muted: 'var(--surface-muted)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          faint: 'var(--ink-faint)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          dark: 'var(--accent-dark)',
          ink: 'var(--accent-ink)',
          tint: 'var(--accent-tint)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          tint: 'var(--danger-tint)',
        },
        // B3 Brandbook (2024)
        b3: {
          turquoise: { DEFAULT: '#0CCCCC', dark: '#06A6A7', deep: '#087272', light: '#A4ECEC' },
          pink: { DEFAULT: '#DF668A', dark: '#C95678', light: '#EFB3C5' },
          blue: { DEFAULT: '#426DA9', dark: '#335B92', light: '#A1B6D4', tint: '#E4EBF5' },
          yellow: { DEFAULT: '#EFBD47', dark: '#C09632', light: '#F7DEA3' },
          beige: '#EEE8E4',
          grey: { DEFAULT: '#404040', dark: '#2A2A2A', light: '#A0A0A0' },
        },
      },
      fontFamily: {
        sans: ['Work Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1rem' }],
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        md: ['1.0625rem', { lineHeight: '1.5rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem' }],
        xl: ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
        tag: 'var(--radius-tag)',
      },
      maxWidth: {
        page: '80rem',
      },
      boxShadow: {
        float: 'var(--shadow-float)',
      },
    },
  },
  plugins: [],
}
