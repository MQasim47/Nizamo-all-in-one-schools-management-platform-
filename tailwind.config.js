/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy palette (marketing + pages not yet moved to the app tokens)
        cream: '#F5F0E8',
        sand: '#EDE6D9',
        'warm-white': '#FBF8F3',
        espresso: '#2C1810',
        'brown-mid': '#5C3D2E',
        'brown-light': '#8B6355',
        terracotta: '#C4622D',
        'terra-light': '#E07848',
        gold: '#D4A853',
        'school-green': '#4A8C6F',
        'school-red': '#C0392B',
        orange: '#D4732D',
        'text-dark': '#1E1208',
        'text-mid': '#4A3728',
        'text-light': '#8B7566',

        // App design tokens. Values live in app/globals.css (:root), documented in docs/DESIGN.md.
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        sunken: 'var(--sunken)',
        sidebar: 'var(--sidebar)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        ink: { DEFAULT: 'var(--text)', 2: 'var(--text-2)', 3: 'var(--text-3)' },
        accent: { DEFAULT: 'var(--accent)', strong: 'var(--accent-strong)', text: 'var(--accent-text)', soft: 'var(--accent-soft)' },
        ok: { DEFAULT: 'var(--ok)', soft: 'var(--ok-soft)' },
        warn: { DEFAULT: 'var(--warn)', soft: 'var(--warn-soft)' },
        bad: { DEFAULT: 'var(--bad)', soft: 'var(--bad-soft)' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      // Type scale. Inter for all UI text; Playfair (font-serif) ONLY for page titles and big numbers.
      fontSize: {
        caption: ['12px', { lineHeight: '16px' }],
        label: ['13px', { lineHeight: '18px' }],
        body: ['14px', { lineHeight: '22px' }],
        lead: ['16px', { lineHeight: '24px' }],
        heading: ['18px', { lineHeight: '26px' }],
        title: ['28px', { lineHeight: '34px', letterSpacing: '-0.01em' }],
        stat: ['32px', { lineHeight: '36px', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        ctl: '8px',
        card: '12px',
        DEFAULT: '9px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        pop: 'var(--shadow-pop)',
        card: '0 4px 16px rgba(44,24,16,0.08)',
        modal: '0 24px 64px rgba(44,24,16,0.16)',
      },
      width: { sidebar: '220px' },
      margin: { sidebar: '220px' },
    },
  },
  plugins: [],
}
