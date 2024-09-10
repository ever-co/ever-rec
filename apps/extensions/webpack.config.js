//@ts-check
const path = require('path');
const Handlebars = require('handlebars');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const { version } = require('./package.json');

function transformManifest(content) {
  const template = Handlebars.compile(content.toString('utf8'));
  const name = process.env.EXTENSION_NAME;

  const manifest = JSON.parse(template({ name, version }));

  return JSON.stringify(manifest, null, 2);
}

module.exports = {
  mode: 'production',
  entry: {
    'content/content': './src/content/content.ts',
    background: './src/background.ts',
    'popup/popup': './src/content/popup/popup.tsx',
    'panel/panel': './src/content/panel/panel.tsx',
    'recording/recording': './src/content/recording/recording.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
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
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s?css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass'),
              sassOptions: {
                fiber: false,
              },
              additionalData: `$static-url: ${JSON.stringify(
                process.env.STATIC_FILES_URL,
              )};`,
            },
          },
        ],
      },
      {
        test: /\.less$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
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
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 20 * 1024, // 20kb
          },
        },
        generator: {
          filename: 'img/[name].[hash:7][ext]',
        },
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024, // 10kb
          },
        },
        generator: {
          filename: 'media/[name].[hash:7][ext]',
        },
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024, // 10kb
          },
        },
        generator: {
          filename: 'fonts/[name].[hash:7][ext]',
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'icons', to: 'icons' },
        { from: 'images', to: 'images' },
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
          from: './src/content/popup/popup.html',
          to: 'popup/popup.html',
          transform: transformHtml,
        },
        // ... (other copy patterns remain the same)
        {
          from: 'src/manifest.json',
          to: 'manifest.json',
          transform: transformManifest,
        },
      ],
    }),
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
};

function transformHtml(content) {
  return require('ejs').render(content.toString(), {
    ...process.env,
  });
}
