/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sour Pickle Brand Colors
        background: 'hsl(60 100% 97%)',
        foreground: 'hsl(200 100% 15%)',
        primary: {
          DEFAULT: 'hsl(75 77% 50%)', // Lime Green
          foreground: 'hsl(60 100% 97%)',
        },
        secondary: {
          DEFAULT: 'hsl(140 42% 45%)', // Forest Green
          foreground: 'hsl(60 100% 97%)',
        },
        muted: {
          DEFAULT: 'hsl(48 70% 92%)', // Light Cream
          foreground: 'hsl(200 100% 15%)',
        },
        accent: {
          DEFAULT: 'hsl(320 100% 70%)', // Pink
          foreground: 'hsl(60 100% 97%)',
        },
        navy: {
          DEFAULT: 'hsl(200 100% 15%)', // Navy Blue
          foreground: 'hsl(60 100% 97%)',
        },
        border: 'hsl(48 70% 85%)',
        input: 'hsl(48 70% 90%)',
        ring: 'hsl(75 77% 50%)',
      },
      boxShadow: {
        'pickle': '0 10px 30px -10px hsl(75 77% 50% / 0.3)',
        'glow': '0 0 40px hsl(320 100% 70% / 0.4)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, hsl(75 77% 50%), hsl(140 42% 45%))',
        'gradient-accent': 'linear-gradient(135deg, hsl(320 100% 70%), hsl(75 77% 50%))',
      },
    },
  },
  plugins: [],
}
