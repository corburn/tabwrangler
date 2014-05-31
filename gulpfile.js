'use strict';

var path = {
  sass: [
    ''
  ],
  script: [
    '*.js',
    'js/**/*.js',
  ],
  html: [
    'popup.html'
  ],
  css: [
    'css/*.css',
    'bower_components/angular/angular-csp.css',
    'bower_components/bootstrap/dist/css/bootstrap.css'
  ],
  dest: {
    css: 'dist/style/'
  }
};

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var wiredep = require('wiredep').stream;

gulp.task('default', ['clean', 'jscs', 'jshint', 'uncss']);

gulp.task('clean', function() {
  return gulp.src(['.tmp', 'dist'], { read: false }).pipe($.clean());
});

// Lint Javascript
gulp.task('jshint', function() {
  return gulp.src(path.script)
  .pipe($.jshint('.jshintrc'))
  .pipe($.jshint.reporter('jshint-stylish'));
});

// Check Javascript code style
gulp.task('jscs', function() {
  return gulp.src(path.script)
  .pipe($.jscs());
});

// Compile sass
gulp.task('sass', function() {
  gulp.src(path.sass)
  .pipe($.sass())
  .pipe(gulp.dest(path.css));
});

// Remove unused CSS rules
gulp.task('uncss', ['sass'], function() {
  return gulp.src(path.css)
  .pipe($.uncss({
    html: path.html, ignore: [], timeout: 0
  }))
  .pipe(gulp.dest(path.dist.css));
});

gulp.task('wiredep', function() {
  gulp.src('popup.html')
  .pipe(wiredep({
    directory: 'bower_components'
  }))
  .pipe(gulp.dest(path.dist));
});

gulp.task('watch', function() {
  gulp.watch(path.script, ['jshint', 'jscs']);
  gulp.watch(path.sass, ['sass']);
});
