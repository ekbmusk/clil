/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0F0F1A',
        surface: '#1A1A2E',
        'surface-2': '#22243F',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: {
          DEFAULT: '#6C63FF',
          soft: '#8B82FF',
          dim: '#4F46C5',
        },
        ink: {
          DEFAULT: 'rgba(255, 255, 255, 0.92)',
          muted: 'rgba(255, 255, 255, 0.62)',
          faint: 'rgba(255, 255, 255, 0.38)',
        },
        success: '#22C55E',
        danger: '#EF4444',
        warn: '#FBBF24',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(100%)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'slide-up': 'slide-up 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
};
