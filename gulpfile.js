var gulp = require('gulp'),
    child = require('child_process');

// Top Level Commands ----------------------------------------------------------

gulp.task('default', ['info']);
gulp.task('lint', ['dolint']);
gulp.task('example', ['serve']);
gulp.task('build', ['build-min', 'build-max']);

// Helper Tasks ----------------------------------------------------------------

gulp.task('info', function() {
  console.log('\nUsage:\t gulp [ lint | example | build ]\n');
});

gulp.task('dolint', function() {
  return child.spawn('./node_modules/.bin/jscs', ['./'],
                     { stdio: 'inherit' });
});

gulp.task('serve', function() {
  console.log('Go to http://127.0.0.1:8080/example/');
  return child.spawn('./node_modules/.bin/http-server', ['./'],
                     { stdio: 'inherit' });
});

gulp.task('build-min', function() {
  var min = ['-o', 'build/config.js',
             'out=dist/events.min.js', 'optimize=uglify'];
  return child.spawn('./node_modules/.bin/r.js', min, { stdio: 'inherit' });
});

gulp.task('build-max', function() {
  var max = ['-o', 'build/config.js', 'out=dist/events.js', 'optimize=none'];
  return child.spawn('./node_modules/.bin/r.js', max, { stdio: 'inherit' });
});
