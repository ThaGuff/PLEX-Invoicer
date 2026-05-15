/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Xero brand palette ──────────────────────────────────────
        // Primary: Xero Blue  #13B5EA  (official hex from brand guidelines)
        // Secondary accents derived from the same hue family
        xero: {
          DEFAULT:  '#13B5EA',   // Xero Blue — primary CTA, links, highlights
          dark:     '#0d8fc0',   // Hover / pressed state
          darker:   '#0a6f97',   // Active / deep
          light:    '#e8f8fd',   // Tinted backgrounds, selected rows
          lighter:  '#f3fbfe',   // Hover row tint
          50:       '#f0faff',
          100:      '#e0f5fe',
          200:      '#baeaf9',
          300:      '#7dd9f4',
          400:      '#38c3ed',
          500:      '#13B5EA',   // brand default
          600:      '#0d8fc0',
          700:      '#0a6f97',
          800:      '#0b5778',
          900:      '#0d4764',
        },
        // Text — Xero uses near-black, not pure black
        ink: {
          DEFAULT: '#1a1a1a',
          muted:   '#7A7E85',   // official Xero grey
          subtle:  '#a0a4ab',
        },
        // Surfaces
        surface: {
          DEFAULT: '#FFFFFF',
          subtle:  '#F5F7F8',   // Xero's off-white page background
          border:  '#E5E8EB',   // Dividers / card borders
          hover:   '#F0F4F6',   // Row hover
        },
      },
      fontFamily: {
        // Xero uses a custom font but pairs with clean sans-serifs
        sans: ['"XeroSans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xero': '6px',   // Xero uses tighter radii than rounded-xl
        'xero-lg': '10px',
      },
      boxShadow: {
        'xero-card': '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        'xero-card-hover': '0 4px 12px rgba(0,0,0,0.12)',
        'xero-btn': '0 1px 2px rgba(19,181,234,0.25)',
      },
    },
  },
  plugins: [],
}
