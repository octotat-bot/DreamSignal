/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Special Elite"', 'serif'],
        body:    ['"Courier Prime"', 'Courier New', 'monospace'],
        mono:    ['"Share Tech Mono"', 'monospace'],
      },
      animation: {
        'develop':  'develop 2.4s ease-out forwards',
        'stamp':    'stamp 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
        'grain':    'grain 0.4s steps(1) infinite',
        'unredact': 'unredact 0.6s ease-in-out forwards',
        'blink':    'blink 1s step-end infinite',
        'pulse-red':'pulseRed 2s ease-in-out infinite',
      },
      keyframes: {
        develop: {
          '0%':   { filter: 'brightness(0) sepia(1)',                            opacity: '0'   },
          '15%':  { filter: 'brightness(0.1) sepia(1) saturate(0.3)',            opacity: '0.4' },
          '40%':  { filter: 'brightness(0.4) sepia(0.9) saturate(0.6)',          opacity: '0.7' },
          '70%':  { filter: 'brightness(0.75) sepia(0.6) saturate(0.8)',         opacity: '0.9' },
          '100%': { filter: 'brightness(1) sepia(0.15) saturate(1)',             opacity: '1'   },
        },
        stamp: {
          '0%':   { transform: 'scale(3) rotate(-8deg)',       opacity: '0', boxShadow: 'none' },
          '60%':  { transform: 'scale(0.95) rotate(var(--rot,−2deg))', opacity: '1', boxShadow: '0 0 0 4px rgba(139,26,26,0.25)' },
          '75%':  { transform: 'scale(1.05) rotate(var(--rot,−2deg))' },
          '100%': { transform: 'scale(1) rotate(var(--rot,−2deg))',  boxShadow: 'none' },
        },
        grain: {
          '0%,100%': { transform: 'translate(0,0)' },
          '10%':     { transform: 'translate(-2%,-3%)' },
          '30%':     { transform: 'translate(3%,-1%)' },
          '50%':     { transform: 'translate(-1%,3%)' },
          '70%':     { transform: 'translate(2%,1%)' },
          '90%':     { transform: 'translate(-3%,2%)' },
        },
        unredact: {
          '0%':   { transform: 'scaleX(1)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(0)', transformOrigin: 'left' },
        },
        blink: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0' },
        },
        pulseRed: {
          '0%,100%': { boxShadow: '0 0 8px 2px rgba(107,26,10,0.2)' },
          '50%':     { boxShadow: '0 0 20px 6px rgba(107,26,10,0.5)' },
        },
      },
    },
  },
  plugins: [],
};
