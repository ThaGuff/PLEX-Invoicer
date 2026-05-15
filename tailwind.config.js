/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#C97B2E',
          light: '#E5A00D',
          dark: '#9a5a1a',
        },
        neutral: {
          cream: '#F5F0E8',
        }
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
