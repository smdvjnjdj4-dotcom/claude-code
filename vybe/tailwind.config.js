/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        accent2: 'rgb(var(--accent2) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { '2xl': '1.125rem', '3xl': '1.5rem' },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--accent) / 0.25), 0 8px 32px -8px rgb(var(--accent) / 0.45)',
        card: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 12px 40px -16px rgb(0 0 0 / 0.6)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        drift: { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(4%,-3%) scale(1.08)' } },
      },
      animation: { shimmer: 'shimmer 1.6s infinite', drift: 'drift 24s ease-in-out infinite' },
    },
  },
  plugins: [],
};
