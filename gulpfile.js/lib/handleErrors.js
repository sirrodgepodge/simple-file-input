var notify = require('gulp-notify');

module.exports = function handleErrors(errorObject, callback) {
  notify.onError(errorObject.toString().split(': ').join(':\n')).apply(this, arguments);
  // Keep gulp from hanging on this task
  if (this && typeof this.emit === 'function') this.emit('end');
};
