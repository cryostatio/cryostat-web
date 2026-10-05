const fs = require('fs');
const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const { EnvironmentPlugin, sources } = require('webpack');
const { stylePaths } = require('./stylePaths');

const MOCK_SERVICE_WORKER_SRC = path.resolve(__dirname, 'src', 'app', 'assets', 'mockServiceWorker.js');

class CopyMockServiceWorkerPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('CopyMockServiceWorkerPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: 'CopyMockServiceWorkerPlugin', stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        () => {
          const content = fs.readFileSync(MOCK_SERVICE_WORKER_SRC, 'utf8');
          compilation.emitAsset('mockServiceWorker.js', new sources.RawSource(content));
        },
      );
    });
  }
}

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
      PREVIEW: process.env.PREVIEW || 'false',
      I18N_NAMESPACE: process.env.I18N_NAMESPACE || '',
      BASEPATH: process.env.BASEPATH || ''
    }),
    new CopyMockServiceWorkerPlugin()
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
