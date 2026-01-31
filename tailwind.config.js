/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular', 'System'],
        arabic: ['ScheherazadeNew_400Regular', 'serif'],
        'jakarta-light': ['PlusJakartaSans_300Light'],
        'jakarta-medium': ['PlusJakartaSans_500Medium'],
        'jakarta-bold': ['PlusJakartaSans_700Bold'],
        'amiri': ['Amiri_400Regular'],
        'amiri-bold': ['Amiri_700Bold'],
      },
      colors: {
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          850: '#064e3b',
          950: '#022c22',
        },
        sand: {
          50: '#fcfbf9',
          100: '#f3f1eb',
          200: '#e4dfd4',
          300: '#d0c6b0',
          800: '#5c5443',
          900: '#3f392d',
        },
        night: {
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
    },
  },
  plugins: [],
}
