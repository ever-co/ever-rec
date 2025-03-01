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

/**
 * @type any
 */
const OUTPUT = process.env.NEXT_BUILD_OUTPUT;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: ['standalone', 'export'].includes(OUTPUT) ? OUTPUT : undefined,
  sassOptions: {
    includePaths: [join(__dirname, 'styles')],
  },
  images: {
    domains: ['storage.googleapis.com', 'lh3.googleusercontent.com'],
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
