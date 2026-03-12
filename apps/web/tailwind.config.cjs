module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'serif']
      },
      colors: {
        ink: {
          900: '#0b0b0f',
          800: '#151520',
          700: '#1f2230'
        },
        clay: {
          500: '#d2a26b',
          400: '#e6c094'
        },
        sage: {
          500: '#5c7c6d',
          300: '#91b09f'
        }
      },
      boxShadow: {
        soft: '0 18px 40px rgba(12, 12, 20, 0.18)'
      }
    }
  },
  plugins: []
};
