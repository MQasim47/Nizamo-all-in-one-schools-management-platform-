/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Exact color palette from PHP MVP - nothing changes visually
      colors: {
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
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      borderRadius: {
        DEFAULT: '9px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
      boxShadow: {
        card: '0 4px 16px rgba(44,24,16,0.08)',
        modal: '0 24px 64px rgba(44,24,16,0.16)',
      },
      width: {
        sidebar: '220px',
      },
      margin: {
        sidebar: '220px',
      },
    },
  },
  plugins: [],
}
