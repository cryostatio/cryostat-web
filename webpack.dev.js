const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const ESLintPlugin = require('eslint-webpack-plugin');
const { EnvironmentPlugin } = require('webpack');
const { stylePaths } = require('./stylePaths');

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || "9000";

module.exports = merge(common('development'), {
  mode: 'development',
  devtool: 'eval-source-map',
  devServer: {
    compress: true,
    historyApiFallback: true,
    host: HOST,
    hot: true,
    open: true,
    port: PORT,
    // In preview mode, requests are intercepted with miragejs
    proxy: process.env.PREVIEW? undefined: [
      {
        context: ['/api', '/health', '/grafana'],
        target: process.env.CRYOSTAT_PROXY_URL ?? 'https://localhost:8443',
        secure: false, // ignore insecure tls
        auth: 'user:pass',
        ws: true,
        followRedirects: true,
      }
    ]
  },
  plugins: [
    new EnvironmentPlugin({
      // Requests are proxied by dev-server
      // In preview mode, a base url is required.
      CRYOSTAT_AUTHORITY: process.env.PREVIEW? 'http://localhost:8181': '', 
      PREVIEW: process.env.PREVIEW || 'false'
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        include: [...stylePaths],
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  output: {
    publicPath: "/"
  }
});

if (process.env.ESLINT_ENABLE === 'true') {
  console.log('ESLint webpack-plugin enabled...');
  module.exports.plugins.push(new ESLintPlugin({
    cache: true,
    cacheLocation: path.resolve(__dirname, '.eslintcache'),
    extensions: ['js', 'jsx', 'ts', 'tsx'],
    exclude: ['node_modules', 'dist'],
  }));
}
