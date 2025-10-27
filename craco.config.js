const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add fallbacks for Node.js core modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "path": require.resolve("path-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "crypto": require.resolve("crypto-browserify"),
        "util": require.resolve("util/"),
        "fs": false, // fs can't work in browser
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process/browser.js") // Add .js extension
      };

      // Add plugins to provide global variables
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser.js',
          Buffer: ['buffer', 'Buffer'],
        })
      );

      // Ensure proper module resolution
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        'process': 'process/browser.js'
      };

      return webpackConfig;
    },
  },
};