/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#223872', hover: '#1a2d5e', light: '#2d4a8a' },
        accent: { DEFAULT: '#f06517', hover: '#d4571a' },
        surface: { DEFAULT: '#ffffff', dark: '#212537', elevated: '#2a2f45' },
        status: {
          success: '#1eb859', error: '#e63946',
          warning: '#f4a261', info: '#0a84ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'Outfit', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
