const ejs = require('ejs');
const path = require('path');
const Handlebars = require('handlebars');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const { version } = require('./package.json');

function transformManifest(content) {
  const template = Handlebars.compile(content.toString('utf8'));
  const name = process.env.EXTENSION_NAME;

  const manifest = JSON.parse(template({ name, version }));

  return JSON.stringify(manifest, null, 2);
}

module.exports = {
  entry: {
    'content/content': './src/content/content.ts',
    background: './src/background.ts',
    'popup/popup': './src/content/popup/popup.tsx',
    'panel/panel': './src/content/panel/panel.tsx',
    'recording/recording': './src/content/recording/recording.tsx',
  },
  resolve: {
    extensions: ['.js', '.json', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react'],
            },
          },
          'ts-loader',
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.s?css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              additionalData:
                '$static-url: ' +
                JSON.stringify(process.env.STATIC_FILES_URL) +
                ';',
            },
          },
          'postcss-loader',
        ],
      },
      {
        test: /\.less$/i,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 20000,
          name: 'img/[name].[hash:7].[ext]',
        },
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'media/[name].[hash:7].[ext]',
        },
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: '[name].[hash:7].[ext]',
          outputPath: 'fonts',
          publicPath: '../fonts',
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin(
      [
        {
          from: 'icons',
          to: 'icons',
        },
        {
          from: 'images',
          to: 'images',
        },
        {
          from: './src/content/popup/popup.html',
          to: 'popup/popup.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'index.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'signin.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'media/images.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'media/videos.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'media/shared.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'media/trashed.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'settings/profile.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'integrations/drive.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'integrations/slack.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'integrations/dropbox.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'integrations/jira.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'integrations/trello.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'edit.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'install.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'image.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'video.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'preferences.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'upload.html',
          transform: transformHtml,
        },
        {
          from: './src/content/recording/recording.html',
          to: 'camera-only.html',
          transform: transformHtml,
        },
        {
          from: './src/content/recording/recording.html',
          to: 'desktop-capture.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'grantAccess.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'media/workspace.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'ws-image.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'ws-video.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'media/workspace-settings.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'media/manage-workspace.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'media/manage-workspace-teams.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'media/integrations.html',
          transform: transformHtml,
        },
        {
          from: './src/content/panel/entryPoints/index.html',
          to: 'no-access.html',
          transform: transformHtml,
        },
        {
          from: 'src/manifest.json',
          to: 'manifest.json',
          transform: transformManifest,
        },
      ],
      { copyUnmodified: true },
    ),
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          comments: false,
        },
      }),
    ],
  },
};

function transformHtml(content) {
  return ejs.render(content.toString(), {
    ...process.env,
  });
}
