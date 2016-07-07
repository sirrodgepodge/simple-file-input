const gulp = require('gulp');
const del = require('del');

gulp.task('clean', cb => 
  del([
    'index.js',
    'server.js'
  ], cb));
