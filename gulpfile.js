'use strict';

var path = {
	scripts: [
	'**/*.js',
	'!node_modules/**'
	]
};

var gulp = require('gulp');
var gulpLoadPlugins = require("gulp-load-plugins");
var plugins = require("gulp-load-plugins")();

gulp.task('default', ['jshint'], function() {
	// place code for your default task here
});

gulp.task('jshint', function() {
	return gulp.src(path.scripts)
	.pipe(plugins.jshint('.jshintrc'))
	.pipe(plugins.jshint.reporter('jshint-stylish'));
});
