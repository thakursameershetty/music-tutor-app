/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['"Space Grotesk"', 'sans-serif'], // We'll use Space Grotesk as our "display" font
      },
      colors: {
        neon: {
          cyan: '#00f0ff',
          purple: '#bd00ff',
          blue: '#2f5aff',
          green: '#00ff94',
          pink: '#ff0055',
          yellow: '#f0ff00',
        },
        surface: {
          dark: '#020202', // Slightly deeper black
          light: '#ffffff',
        }
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%23ffffff' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E\")",
      }
    },
  },
  plugins: [],
}