/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        'lime-green': 'rgb(194, 255, 0)',
        'forest-green': 'rgb(67, 160, 102)',
        'pink': 'rgb(255, 102, 204)',
        'navy-blue': 'rgb(0, 38, 77)',
        'cream': 'rgb(250, 245, 220)',
      },
    },
  },
  plugins: [],
}

