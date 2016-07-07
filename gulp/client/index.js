const gulp = require('gulp');
const babel = require('gulp-babel');

gulp.task('client', function () {
  return gulp.src('src/component.js')
    .pipe(babel())
    .pipe(gulp.dest('index.js'));
});
