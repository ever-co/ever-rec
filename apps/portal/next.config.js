const { join } = require('path');
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  sassOptions: {
    includePaths: [join(__dirname, 'styles')],
  },
  images: {
    domains: ['storage.googleapis.com'],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/media/images',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/fonts/:path*',
        destination: 'https://api.rec.so/fonts/:path*',
      },
    ];
  },
  webpack: (config) => {
    // Ajoutez la vérification de LD_LIBRARY_PATH ici
    if (
      process.env.LD_LIBRARY_PATH == null ||
      !process.env.LD_LIBRARY_PATH.includes(
        `${process.env.PWD}/node_modules/canvas/build/Release:`,
      )
    ) {
      process.env.LD_LIBRARY_PATH = `${
        process.env.PWD
      }/node_modules/canvas/build/Release:${process.env.LD_LIBRARY_PATH || ''}`;
    }

    // Configuration Webpack pour les fichiers SCSS
    config.module.rules.push({
      test: /\.scss$/,
      use: [
        'style-loader',
        'css-loader',
        {
          loader: 'sass-loader',
          options: {
            sourceMap: true,
          },
        },
      ],
    });

    return config;
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
