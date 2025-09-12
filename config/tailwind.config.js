/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 1s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'connection-pulse': 'connectionPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        connectionPulse: {
          '0%, 100%': { strokeDasharray: '5,5', strokeDashoffset: '0' },
          '50%': { strokeDasharray: '5,5', strokeDashoffset: '10' },
        },
      },
      colors: {
        overlay: {
          background: 'rgba(0, 0, 0, 0.4)',
          surface: 'rgba(255, 255, 255, 0.95)',
          border: 'rgba(0, 0, 0, 0.1)',
        },
        connection: {
          active: '#3B82F6',
          inactive: '#9CA3AF',
          pulse: '#60A5FA',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      zIndex: {
        'overlay': '1000',
        'overlay-controls': '1001',
        'overlay-modal': '1002',
      }
    },
  },
  plugins: [],
}