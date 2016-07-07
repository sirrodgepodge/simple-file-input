var gulp = require('gulp');
var gulpSequence = require('gulp-sequence');

gulp.task('build', (cb) =>
    gulpSequence('clean', ['client', 'server'], cb));
