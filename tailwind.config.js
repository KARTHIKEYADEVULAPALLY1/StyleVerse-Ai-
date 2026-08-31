/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0A0A0F',
          surface: '#14141C',
          card: 'rgba(255,255,255,0.05)',
          text: '#FFFFFF',
          secondary: '#A0A0B0'
        },
        light: {
          bg: '#FFF7FA',
          surface: '#FFFFFF',
          card: 'rgba(255,255,255,0.85)',
          text: '#1A1A1A',
          secondary: '#6E6E7E'
        },
        primary: '#FF2E88',
        secondary: '#8B5CF6',
        accent: '#FFB020',
        'accent-cyan': '#00E5FF',
        'soft-pink': '#FFE4EC',
        noir: '#0A0A0F'
      },
      fontFamily: {
        sans: ['Montserrat', 'Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Italiana', 'Cormorant Garamond', 'Satoshi', 'serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif']
      },
      borderRadius: {
        '4xl': '24px',
        '5xl': '32px'
      },
      boxShadow: {
        glow: '0 0 40px rgba(255, 46, 136, 0.25)',
        'glow-violet': '0 0 40px rgba(139, 92, 246, 0.25)',
        'glow-cyan': '0 0 40px rgba(0, 229, 255, 0.25)',
        'glow-amber': '0 0 40px rgba(255, 176, 32, 0.25)',
        'soft': '0 20px 60px rgba(0, 0, 0, 0.15)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.12)'
      },
      letterSpacing: {
        'luxury': '0.2em',
        'couture': '0.35em'
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
        'spin-slow': 'spin 12s linear infinite',
        'gradient': 'gradient 8s ease infinite',
        'shine': 'shine 3s ease infinite',
        'rainbow': 'rainbow 8s ease infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' }
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        shine: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' }
        },
        rainbow: {
          '0%, 100%': { filter: 'hue-rotate(0deg)' },
          '50%': { filter: 'hue-rotate(30deg)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}