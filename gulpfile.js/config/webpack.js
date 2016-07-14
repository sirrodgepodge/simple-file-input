const webpack         = require('webpack'),
      path            = require('path'),
      fs              = require('fs');

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
      publicPath = './';  // public javascript file kept at root


const webpackConfig = {
  entry: [
    './src/SimpleFileInput'
  ],

  externals: fs.readdirSync('node_modules'),

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
        // exclude: [/node_modules/],s
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
        NODE_ENV: JSON.stringify('production') // sets on client too
      }
    }),
    new webpack.optimize.DedupePlugin(),
    // new webpack.optimize.UglifyJsPlugin({
    //   sourceMap: false
    // }),
    new webpack.NoErrorsPlugin() // prevents updating of generated files when there are errors
  ]
};

module.exports = webpackConfig;
