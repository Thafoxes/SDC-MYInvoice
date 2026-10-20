/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        orbyte: {
          bg: '#E8F6FE',
          sidebar: '#EAF5FF',
          card: '#FFFFFF',
          blue: '#4096EE',
          button: '#1D72E0',
          ink: '#162A50',
          muted: '#64748B',
          border: '#D6E7F5',
          paid: '#16A34A',
          pending: '#F59E0B',
          overdue: '#EF4444',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(22,42,80,0.06), 0 1px 2px rgba(22,42,80,0.04)',
        cardhover: '0 6px 18px rgba(22,42,80,0.10)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
};
