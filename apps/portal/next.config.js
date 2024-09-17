//@ts-check
const { join } = require('path');
const { withSentryConfig } = require('@sentry/nextjs');

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

  //Load fonts from API
  async rewrites() {
    return [
      {
        source: '/fonts/:path*',
        destination: 'https://api.rec.so/fonts/:path*',
      },
    ];
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
