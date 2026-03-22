/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sentinel: {
          bg: '#0a0a0f',
          card: '#12121a',
          border: '#1e1e2e',
        },
      },
    },
  },
  plugins: [],
};
