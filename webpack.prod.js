const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const { EnvironmentPlugin } = require('webpack');
const { stylePaths } = require('./stylePaths');

module.exports = merge(common('production'), {
  mode: 'production',
  cache: {
    type: 'filesystem',
    compression: 'gzip',
    cacheDirectory: path.resolve(__dirname, '.build_cache'),
  },
  optimization: {
    minimizer: [
      new TerserJSPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              mergeLonghand: false,
              discardComments: { removeAll: true }
            }
          ]
        },
      }),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].bundle.css',
      chunkFilename: '[name].[contenthash].bundle.css' // lazy-load css
    }),
    new EnvironmentPlugin({
      CRYOSTAT_AUTHORITY: process.env.PREVIEW ? 'http://localhost:8181' : '',
      PREVIEW: process.env.PREVIEW || 'false'
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        include: [...stylePaths],
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  }
});
