const merge = require('webpack-merge');
const config = require('./webpack.config.js');
const path = require('path');
const DotenvPlugin = require('dotenv-webpack');

const target = 'prod';

require('dotenv').config({ path: `.env.${target}` });

module.exports = merge(config, {
  mode: 'production',
  output: {
    path: path.join(__dirname, 'build', target),
    filename: '[name].js',
  },
  plugins: [
    new DotenvPlugin({
      path: `./.env.${target}`,
    }),
  ],
});
