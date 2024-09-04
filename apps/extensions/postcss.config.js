const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const tailwindcss = require('tailwindcss');
const purgeCss = require('@fullhuman/postcss-purgecss');

module.exports = {
  plugins: [
    tailwindcss({ config: './tailwind.config.js' }),
    autoprefixer(),
    ...(process.env.BUILD ? [cssnano({ preset: 'default' })] : []),
    ...(process.env.MODE === 'production'
      ? [
          purgeCss({
            content: ['./**/*.tsx'],
            safelist: ['tw-dark'],
            extractors: [
              {
                extractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
                extensions: ['tsx'],
              },
            ],
          }),
        ]
      : []),
  ],
};
