var gulp = require('gulp');
var gulpSequence = require('gulp-sequence');

gulp.task('build:development', (cb) =>
    gulpSequence('clean', ['client', 'server'], cb));
