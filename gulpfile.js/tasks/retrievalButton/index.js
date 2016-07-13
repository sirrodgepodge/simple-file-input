import gulp from 'gulp';
import babel from 'gulp-babel';

gulp.task('retrievalButton', function () {
  return gulp.src('src/RetrievalButton.js')
    .pipe(babel())
    .pipe(gulp.dest('./'));
});
