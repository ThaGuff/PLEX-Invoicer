/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // PLEX brand (from plexautomation.io)
        brand: {
          DEFAULT: '#C97B2E',
          light: '#E5A00D',
          dark: '#9a5a1a',
          50:  '#fdf8f0',
          100: '#f9edd8',
          200: '#f2d9ac',
          300: '#e8bf76',
          400: '#dca04a',
          500: '#C97B2E',
          600: '#b56424',
          700: '#964f1d',
          800: '#7a3f1a',
          900: '#633417',
        },
        // Ramp.com yellow accent
        ramp: {
          DEFAULT: '#EBF123',
          dark: '#c8cc10',
          50: '#fdfee8',
          100: '#fafcc2',
          200: '#f5f788',
          300: '#EBF123',
          400: '#d4d910',
          500: '#b8bb0b',
        },
        // UI neutrals (Ramp-influenced dark)
        ink: {
          DEFAULT: '#1C1B17',
          soft: '#2d2c26',
          muted: '#6b6a62',
        },
        cream: '#F5F0E8',
        surface: '#FAFAF8',
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(28,27,23,0.06), 0 1px 2px rgba(28,27,23,0.04)',
        'card-hover': '0 4px 12px rgba(28,27,23,0.1), 0 2px 4px rgba(28,27,23,0.06)',
        'elevated': '0 8px 24px rgba(28,27,23,0.12)',
      }
    },
  },
  plugins: [],
}
