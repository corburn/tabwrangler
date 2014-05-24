require.config({
  baseUrl: 'js',
  paths: {
    // the left side is the module ID,
    // the right side is the path to
    // the script file, relative to baseUrl.
    // The path should NOT include
    // the '.js' file extension
    bootstrap: '../bower_components/bootstrap/docs/assets/js/bootstrap.min',
    jquery: '../bower_components/jquery/dist/jquery.min',
    'jquery.timeago': '../bower_components/jquery-timeago/jquery.timeago',
    underscore: '../bower_components/underscore/underscore'
  },
  shim: {
    bootstrap: ['jquery'],
    'jquery.timeago': ['jquery'],
    underscore: {
      exports: '_'
    }
  }
});
