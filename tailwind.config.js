const colors = require('tailwindcss/colors');
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.hbs',
    './views/*.hbs'
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.blue,
        secondary: colors.gray,
      },
      fontFamily: {
        sans: ['"Noto Sans JP"'],
      },
    },
  },

  variants: {
    opacity: ['responsive', 'hover', 'focus', 'disabled'],
  },

  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms')
  ]
}

