/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        orbyte: {
          bg: '#F8FAFC',
          sidebar: '#FFFFFF',
          card: '#FFFFFF',
          blue: '#1D4ED8',
          button: '#1D4ED8',
          ink: '#0F172A',
          muted: '#475569',
          border: '#E2E8F0',
          paid: '#16A34A',
          pending: '#D97706',
          overdue: '#DC2626',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        popover: '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
      },
      fontSize: {
        xs: ['0.875rem', '1.3rem'],      // 14px  (was 12px) - body text
        sm: ['0.9375rem', '1.4rem'],     // 15px  - emphasised body
        base: ['1rem', '1.5rem'],        // 16px  - section titles
        lg: ['1.125rem', '1.6rem'],      // 18px
        xl: ['1.25rem', '1.75rem'],      // 20px  - page title
        '2xl': ['1.75rem', '2.1rem'],    // 28px  - KPI numbers
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '8px',
      },
    },
  },
  plugins: [],
};
