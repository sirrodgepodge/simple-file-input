const webpack         = require('webpack'),
      path            = require('path');

// /***********************************************************************
//  * @TODO: Reconcile development/test/production cofiguration.          *
//  * Webpack's dev configuration is now handled in webpack.config.js     *
//  * This file is currently used for production **only**.                *
//  ***********************************************************************
//  * @TODO: Rewrite gulpfile.js/tasks/webpack-production.js              *
//  ***********************************************************************/

// Path vars
const jsSrc = path.resolve('../'),
      jsDest = path.resolve('./'),
      publicPath = '/';  // public javascript file kept at root


const webpackConfig = {
  entry: [
    './src/SimpleFileInput.js'
  ],

  output: {
    path: jsDest,
    filename: 'index.js',
    publicPath
  },

  resolve: {
    extensions: ['', '.js', '.jsx']
  },

  module: {
    loaders: [
      {
        test: /\.jsx*$/,
        exclude: [/node_modules/],
        loader: 'babel',
        include: jsSrc,
        query: {
          plugins: ['transform-decorators-legacy'],
          presets: ['es2015', 'react', 'stage-0'],
        },
      },
    ]
  },

  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production'), // sets on client too
        CLIENT: JSON.stringify(true)
      }
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: false
    })
  ]
};

module.exports = webpackConfig;
