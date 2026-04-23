/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        peach: {
          50: '#fff8ee',
          100: '#fef0d9',
          200: '#fde4bc',
          300: '#fbd394',
        },
        cocoa: {
          200: '#e8d5c0',
          300: '#c9a886',
          500: '#7a5b3d',
          700: '#3d2817',
          900: '#241509',
        },
        blush: {
          light: '#ffb3a7',
          DEFAULT: '#ff8a7a',
          dark: '#e66a5a',
          deep: '#c9694f',
        },
        mint: {
          DEFAULT: '#9be3c2',
          dark: '#6cc8a3',
        },
        sky: {
          DEFAULT: '#bee0f7',
          dark: '#86c1e3',
        },
        sun: {
          DEFAULT: '#ffd166',
          dark: '#f0b945',
        },
        rock: {
          light: '#d4c4b5',
          DEFAULT: '#a89484',
          dark: '#6e5a4a',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
      borderRadius: {
        chunk: '1.5rem',
      },
      boxShadow: {
        soft: '0 6px 20px -8px rgba(61, 40, 23, 0.18)',
        pop: '0 4px 0 rgba(61, 40, 23, 0.12)',
      },
    },
  },
  plugins: [],
};
