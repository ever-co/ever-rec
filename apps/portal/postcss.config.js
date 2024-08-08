module.exports = {
  plugins: {
    tailwindcss: { config: 'apps/portal/tailwind.config.js' },
    autoprefixer: {},
    ...(process.env.BUILD ? { cssnano: {} } : {}),
    '@fullhuman/postcss-purgecss':
      process.env.MODE === 'production'
        ? {
            content: ['./**/*.tsx'],
            safelist: ['tw-dark'],
            extractors: [
              {
                extractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
                extensions: ['tsx'],
              },
            ],
          }
        : false,
  },
};
