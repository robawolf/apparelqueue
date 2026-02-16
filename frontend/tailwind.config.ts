import type {Config} from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./app/**/*.{ts,tsx}', './sanity/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
    extend: {
      // Custom shadows
      boxShadow: {
        layer: '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
        'theme-card': 'var(--theme-card-shadow)',
      },

      // Dynamic theme colors are now handled via CSS custom properties in globals.css
      // Keep static colors for backward compatibility and fallbacks
      colors: {
        // Theme colors will be available as primary-*, secondary-*, accent-* via CSS variables

        // Static brand colors (keep existing)
        black: '#0d0e12',
        white: '#fff',
        cyan: {
          50: '#e7fefe',
          100: '#c5fcfc',
          200: '#96f8f8',
          300: '#62efef',
          400: '#18e2e2',
          500: '#04b8be',
          600: '#037782',
          700: '#024950',
          800: '#042f34',
          900: '#072227',
          950: '#0d181c',
        },
        gray: {
          50: '#f6f6f8',
          100: '#eeeef1',
          200: '#e3e4e8',
          300: '#bbbdc9',
          400: '#9499ad',
          500: '#727892',
          600: '#515870',
          700: '#383d51',
          800: '#252837',
          900: '#1b1d27',
          950: '#13141b',
        },
        red: {
          50: '#fff6f5',
          100: '#ffe7e5',
          200: '#ffdedc',
          300: '#fdada5',
          400: '#f77769',
          500: '#ef4434',
          600: '#cc2819',
          700: '#8b2018',
          800: '#4d1714',
          900: '#321615',
          950: '#1e1011',
        },
        orange: {
          50: '#fcf1e8',
          100: '#f9e3d2',
          200: '#f4c7a6',
          300: '#efab7a',
          400: '#ea8f4e',
          500: '#e57322',
          600: '#ba5f1e',
          700: '#8f4b1b',
          800: '#653818',
          900: '#3a2415',
          950: '#251a13',
        },
        yellow: {
          50: '#fefae1',
          100: '#fcf3bb',
          200: '#f9e994',
          300: '#f7d455',
          400: '#f9bc15',
          500: '#d28a04',
          600: '#965908',
          700: '#653a0b',
          800: '#3b220c',
          900: '#271a11',
          950: '#181410',
        },
        green: {
          50: '#e7f9ed',
          100: '#d0f4dc',
          200: '#a1eaba',
          300: '#72e097',
          400: '#43d675',
          500: '#3ab564',
          600: '#329454',
          700: '#297343',
          800: '#215233',
          900: '#183122',
          950: '#14211a',
        },
      },

      // Typography - dynamic fonts handled via CSS variables
      fontFamily: {
        heading: ['var(--theme-font-heading)', 'var(--font-inter)', 'sans-serif'],
        body: ['var(--theme-font-body)', 'var(--font-inter)', 'sans-serif'],
        sans: ['var(--theme-font-body)', 'var(--font-inter)', 'sans-serif'],
        display: ['var(--theme-font-heading)', 'var(--font-inter)', 'sans-serif'],
      },

      // Dynamic font sizes via CSS variables
      fontSize: {
        'theme-xs': 'var(--theme-font-size-xs)',
        'theme-sm': 'var(--theme-font-size-sm)',
        'theme-base': 'var(--theme-font-size-base)',
        'theme-lg': 'var(--theme-font-size-lg)',
        'theme-xl': 'var(--theme-font-size-xl)',
        'theme-2xl': 'var(--theme-font-size-2xl)',
        'theme-3xl': 'var(--theme-font-size-3xl)',
      },

      // Dynamic spacing
      spacing: {
        'theme-container': 'var(--theme-container-width)',
        'theme-section': 'var(--theme-section-spacing)',
      },

      // Dynamic border radius
      borderRadius: {
        'theme': 'var(--theme-border-radius)',
        'theme-button': 'var(--theme-button-radius)',
        'theme-card': 'var(--theme-card-radius)',
      },

      // Dynamic transitions
      transitionDuration: {
        'theme': 'var(--theme-transition-duration)',
      },
      transitionTimingFunction: {
        'theme': 'var(--theme-transition-timing)',
      },

      // Container max-width override
      maxWidth: {
        'theme-container': 'var(--theme-container-width)',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [
    typography,

    // Custom plugin for theme-based component utilities
    function({ addUtilities, theme }: any) {
      const newUtilities = {
        '.btn-theme': {
          borderRadius: 'var(--theme-button-radius)',
          transitionDuration: 'var(--theme-transition-duration)',
          transitionTimingFunction: 'var(--theme-transition-timing)',
          transitionProperty: 'all',
        },
        '.card-theme': {
          borderRadius: 'var(--theme-card-radius)',
          boxShadow: 'var(--theme-card-shadow)',
        },
        '.container-theme': {
          maxWidth: 'var(--theme-container-width)',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '2rem',
          paddingRight: '2rem',
        },
        '.section-spacing': {
          paddingTop: 'var(--theme-section-spacing)',
          paddingBottom: 'var(--theme-section-spacing)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config
