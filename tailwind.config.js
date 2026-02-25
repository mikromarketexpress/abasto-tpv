/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#25f459',
        'cobalt-deep': '#050b1f',
      }
    },
  },
  plugins: [],
}

