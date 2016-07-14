import gulp from 'gulp';
import babel from 'gulp-babel';
import rename from 'gulp-rename';

gulp.task('client', function () {
  return gulp.src('src/SimpleFileInput.js')
    .pipe(babel())
    .pipe(rename('index.js'))
    .pipe(gulp.dest('./'));
});
