/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        dark: {
          100: '#d1d5db',
          200: '#9ca3af',
          300: '#6b7280',
          400: '#4b5563',
          500: '#374151',
          600: '#1f2937',
          700: '#111827',
          800: '#0f172a',
          900: '#030712',
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'soft-dark': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 3s infinite',
        'energy-wave': 'energy-wave 2s ease-in-out infinite',
        'holo-shimmer': 'holo-shimmer 3s linear infinite',
        'quantum-float': 'quantum-float 4s ease-in-out infinite',
        'quantum-fade': 'quantum-fade 2s ease-in-out infinite',
        'quantum-spin': 'quantum-spin 8s linear infinite',
        'electric-charge': 'electric-charge 2s ease-in-out infinite',
        'lightning': 'lightning 0.5s ease-in-out infinite',
        'energy-pulse': 'energy-pulse 1.5s ease-in-out infinite',
        'ring-spin': 'ring-spin 20s linear infinite',
        'ring-pulse': 'ring-pulse 4s ease-in-out infinite',
        'segment-fade': 'segment-fade 2s ease-in-out infinite',
        'border-rotate': 'border-rotate 8s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'scan-line': 'scan-line 4s linear infinite',
        'data-flow': 'data-flow 3s linear infinite',
        'chain-move': 'chain-move 4s linear infinite',
        'chain-move-reverse': 'chain-move 4s linear infinite reverse',
        'chain-move-fast': 'chain-move 3s linear infinite',
        'hud-rotate': 'hud-rotate 15s linear infinite',
        'hud-rotate-reverse': 'hud-rotate 18s linear infinite reverse',
        'hud-segment-fade': 'hud-segment-fade 3s infinite',
        'hud-pulse': 'hud-pulse 2s infinite',
        'dash': 'dash 5s linear infinite',
        'move-along-path': 'move-along-path 12s linear infinite',
        'plasma-pulse': 'plasma-pulse 4s ease-in-out infinite',
        'plasma-rotate': 'plasma-rotate 20s linear infinite',
        'plasma-rotate-reverse': 'plasma-rotate 20s linear infinite reverse',
        'plasma-float': 'plasma-float 8s ease-in-out infinite',
        'plasma-glow': 'plasma-glow 3s ease-in-out infinite',
        'plasma-particle': 'plasma-particle 10s linear infinite'
      },
      keyframes: {
        rings: {
          '0%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '0.5' },
        },
        'energy-wave': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { transform: 'translateX(0)', opacity: '0.5' },
          '100%': { transform: 'translateX(100%)', opacity: '0' }
        },
        'holo-shimmer': {
          '0%': { 
            backgroundPosition: '200% 50%',
            opacity: '0.7'
          },
          '50%': { 
            backgroundPosition: '-200% 50%',
            opacity: '1'
          },
          '100%': { 
            backgroundPosition: '200% 50%',
            opacity: '0.7'
          }
        },
        'electric': {
          '0%': { filter: 'brightness(1) contrast(1)' },
          '20%': { filter: 'brightness(1.2) contrast(1.5)' },
          '40%': { filter: 'brightness(1) contrast(1)' },
          '60%': { filter: 'brightness(1.3) contrast(2)' },
          '80%': { filter: 'brightness(1) contrast(1)' },
          '100%': { filter: 'brightness(1) contrast(1)' }
        },
        'spark': {
          '0%': { transform: 'rotate(0deg) scale(0)', opacity: '0' },
          '50%': { transform: 'rotate(180deg) scale(1)', opacity: '0.8' },
          '100%': { transform: 'rotate(360deg) scale(0)', opacity: '0' }
        },
        'portal-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'portal-pulse': {
          '0%': { transform: 'scale(1)', filter: 'blur(8px)' },
          '50%': { transform: 'scale(1.1)', filter: 'blur(12px)' },
          '100%': { transform: 'scale(1)', filter: 'blur(8px)' }
        },
        'quantum-float': {
          '0%, 100%': { 
            transform: 'translateY(0) scale(1)',
            filter: 'blur(0px)'
          },
          '50%': { 
            transform: 'translateY(-10px) scale(1.05)',
            filter: 'blur(1px)'
          }
        },
        'quantum-fade': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' }
        },
        'quantum-spin': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.2)' },
          '100%': { transform: 'rotate(360deg) scale(1)' }
        },
        'sci-fi-pulse': {
          '0%, 100%': { 
            transform: 'scale(1)',
            filter: 'brightness(1) blur(0px)'
          },
          '50%': { 
            transform: 'scale(1.05)',
            filter: 'brightness(1.2) blur(2px)'
          }
        },
        'sci-fi-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(59,130,246,0.5), inset 0 0 10px rgba(59,130,246,0.2)',
            opacity: 0.8
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(59,130,246,0.8), inset 0 0 20px rgba(59,130,246,0.4)',
            opacity: 1
          }
        },
        'sci-fi-wave': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        },
        'electric-charge': {
          '0%, 100%': { 
            transform: 'scale(1)',
            filter: 'brightness(1)',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
          },
          '50%': { 
            transform: 'scale(1.05)',
            filter: 'brightness(1.2)',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.8)'
          }
        },
        'lightning': {
          '0%, 100%': { 
            opacity: '0',
            transform: 'scale(0.8)'
          },
          '50%': { 
            opacity: '1',
            transform: 'scale(1)'
          }
        },
        'energy-pulse': {
          '0%, 100%': { 
            transform: 'scale(1)',
            opacity: '0.5'
          },
          '50%': { 
            transform: 'scale(1.2)',
            opacity: '0.8'
          }
        },
        'ring-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'ring-pulse': {
          '0%, 100%': { 
            transform: 'scale(1)',
            opacity: '0.8'
          },
          '50%': { 
            transform: 'scale(1.05)',
            opacity: '1'
          }
        },
        'segment-fade': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' }
        },
        'border-rotate': {
          '0%': {
            'stroke-dashoffset': '0',
            'filter': 'hue-rotate(0deg) brightness(1)'
          },
          '50%': {
            'filter': 'hue-rotate(180deg) brightness(1.2)'
          },
          '100%': {
            'stroke-dashoffset': '200',
            'filter': 'hue-rotate(360deg) brightness(1)'
          }
        },
        'glow-pulse': {
          '0%, 100%': {
            'filter': 'drop-shadow(0 0 2px currentColor)',
            'opacity': '0.6'
          },
          '50%': {
            'filter': 'drop-shadow(0 0 8px currentColor)',
            'opacity': '1'
          }
        },
        'scan-line': {
          '0%': {
            transform: 'translateY(-100%)'
          },
          '100%': {
            transform: 'translateY(100%)'
          }
        },
        'data-flow': {
          '0%': {
            'stroke-dashoffset': '0'
          },
          '100%': {
            'stroke-dashoffset': '-20'
          }
        },
        'chain-move': {
          '0%': {
            'stroke-dashoffset': '0'
          },
          '100%': {
            'stroke-dashoffset': '-30'
          }
        },
        'hud-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'hud-segment-fade': {
          '0%': { opacity: '0.1', strokeDashoffset: '0' },
          '50%': { opacity: '1', strokeDashoffset: '15' },
          '100%': { opacity: '0.1', strokeDashoffset: '30' }
        },
        'hud-pulse': {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.2)', filter: 'brightness(1.5)' }
        },
        'dash': {
          'from': { 'strokeDashoffset': '0' },
          'to': { 'strokeDashoffset': '-30' }
        },
        'move-along-path': {
          '0%': { 'offsetDistance': '0%' },
          '100%': { 'offsetDistance': '100%' }
        },
        'plasma-pulse': {
          '0%, 100%': { 
            opacity: '0.7',
            transform: 'scale(1)',
            filter: 'blur(2px)'
          },
          '50%': { 
            opacity: '0.9',
            transform: 'scale(1.05)',
            filter: 'blur(3px)'
          }
        },
        'plasma-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'plasma-rotate-reverse': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'plasma-float': {
          '0%': { transform: 'translateY(0px) translateX(0px)' },
          '25%': { transform: 'translateY(-5px) translateX(5px)' },
          '50%': { transform: 'translateY(0px) translateX(0px)' },
          '75%': { transform: 'translateY(5px) translateX(-5px)' },
          '100%': { transform: 'translateY(0px) translateX(0px)' }
        },
        'plasma-glow': {
          '0%, 100%': { 
            filter: 'drop-shadow(0 0 5px currentColor)',
            opacity: '0.6'
          },
          '50%': { 
            filter: 'drop-shadow(0 0 15px currentColor)',
            opacity: '0.9'
          }
        },
        'plasma-particle': {
          '0%': { 
            transform: 'translateX(0) translateY(0) scale(1)',
            opacity: '0.4'
          },
          '25%': { 
            transform: 'translateX(20px) translateY(-10px) scale(1.2)',
            opacity: '0.7'
          },
          '50%': { 
            transform: 'translateX(0) translateY(-20px) scale(1)',
            opacity: '0.4'
          },
          '75%': { 
            transform: 'translateX(-20px) translateY(-10px) scale(1.2)',
            opacity: '0.7'
          },
          '100%': { 
            transform: 'translateX(0) translateY(0) scale(1)',
            opacity: '0.4'
          }
        }
      }
    },
  },
  plugins: [],
} 