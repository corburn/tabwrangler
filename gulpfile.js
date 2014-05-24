'use strict';

var path = {
	scripts: [
		'**/*.js',
		'!node_modules/**'
	]
};

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

gulp.task('default', ['jscs', 'jshint'], function() {
	// place code for your default task here
});

gulp.task('jscs', function() {
	return gulp.src(path.scripts)
	.pipe(plugins.jscs());
});

gulp.task('jshint', function() {
	return gulp.src(path.scripts)
	.pipe(plugins.jshint('.jshintrc'))
	.pipe(plugins.jshint.reporter('jshint-stylish'));
});

gulp.task('watch', function() {
	gulp.watch(path.scripts, ['jscs']);
});
