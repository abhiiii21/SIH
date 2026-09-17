/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#070a12',
          900: '#0b0f19',
          850: '#111726',
          800: '#1e293b',
          700: '#334155',
        },
        maritime: {
          blue: '#0ea5e9',
          cyan: '#06b6d4',
          radar: '#10b981',
          slick: '#f43f5e',
          amber: '#f59e0b',
          alert: '#ef4444',
          dark: '#030712'
        },
        'sky-bg-start': '#EAF4FF',
        'sky-bg-mid': '#DCEEFC',
        'sky-bg-end': '#CFE8FA',
        'accent-teal': '#0EA5B7',
        'accent-indigo': '#6366F1',
        'navy-accent': '#0B2545',
        'navy-accent-light': '#123A66',
        'card-border': '#E1EEF9',
        'topbar-border': '#DCEEFC',
      },
      boxShadow: {
        'card-sky': '0 4px 20px rgba(30, 95, 191, 0.08)',
        'card-sky-hover': '0 6px 24px rgba(30, 95, 191, 0.12)',
        'topbar-sky': '0 2px 12px rgba(30, 95, 191, 0.06)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Space Grotesk', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'sans-serif'],
        sans: ['var(--font-body)', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        'page-title': ['28px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'section-title': ['20px', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '600' }],
        'card-header': ['14px', { lineHeight: '1.3', letterSpacing: '0.04em', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.55', fontWeight: '400' }],
        'data': ['13px', { lineHeight: '1.45', letterSpacing: '0.01em', fontWeight: '500' }],
        'data-sm': ['12px', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '500' }],
        'caption': ['11px', { lineHeight: '1.4', fontWeight: '400' }],
        'stat': ['32px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'badge': ['11px', { lineHeight: '1.3', letterSpacing: '0.04em', fontWeight: '600' }],
        'btn': ['13px', { lineHeight: '1', letterSpacing: '0.01em', fontWeight: '600' }],
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.015em',
        normal: '0',
        btn: '0.01em',
        wide: '0.025em',
        wider: '0.04em',
        widest: '0.06em',
        technical: '0.08em',
      },
      animation: {
        'radar-sweep': 'radarSweep 4s linear infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
}
