// eslint-disable-next-line @typescript-eslint/no-var-requires
const withNx = require('@nrwl/next/plugins/with-nx');
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
 * @type {import('@nrwl/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  sassOptions: {
    includePaths: [join(__dirname, 'styles')],
  },
  nx: {
    // Set this to true if you would like to to use SVGR
    // See: https://github.com/gregberge/svgr
    svgr: false,
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

const moduleExports = withNx(nextConfig);

const sentryWebpackPluginOptions = {
  silent: true,
};

module.exports = withSentryConfig(moduleExports, sentryWebpackPluginOptions);
