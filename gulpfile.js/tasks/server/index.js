const gulp = require('gulp');
const babel = require('gulp-babel');

gulp.task('server', function () {
  return gulp.src('src/server.js')
    .pipe(babel())
    .pipe(gulp.dest('./'));
});
