/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0c0e14',
        'brand-panel': '#131722',
        'brand-subtle': '#1c2233',
        'brand-border': '#262e42'
      }
    },
  },
  plugins: [],
};