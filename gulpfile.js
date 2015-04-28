var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var cleancss = require('gulp-cleancss');
var concat = require('gulp-concat');
var cssmin = require('gulp-cssmin');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var inline = require('rework-plugin-inline');
var jshint = require('gulp-jshint');
var path = require('path');
var prefix = require('gulp-autoprefixer');
var rework = require('gulp-rework');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var suit = require('rework-suit');
var uglify = require('gulp-uglify');
var literalify = require('literalify');
var watchify = require('watchify');
var reactify = require('reactify');
var gutil = require('gulp-util');
var livereload = require('gulp-livereload');
var streamify = require('gulp-streamify');
var notify = require('gulp-notify');
var glob = require('glob');
var react = require("gulp-react");


// External dependencies you do not want to rebundle while developing,
// but include in your application deployment
var dependencies = [];

// Bower External dependencies
var bowerDependencies = {
  // map module names with global objects
  'jquery': 'window.$'
};

var browserifyTask = function (options) {

  // Our app bundler
  var appBundler = browserify({
    entries: [options.src], // Only need initial file, browserify finds the rest
    transform: [reactify], // We want to convert JSX to normal javascript
    debug: options.development, // Gives us sourcemapping
    cache: {}, packageCache: {}, fullPaths: options.development // Requirement of watchify
  }).transform(literalify.configure(bowerDependencies));

  // We set our dependencies as externals on our app bundler when developing
  (options.development ? dependencies : []).forEach(function (dep) {
    appBundler.external(dep);
  });

  // The rebundle process
  var rebundle = function () {
    var start = Date.now();
    console.log('Building APP bundle');
    appBundler.bundle()
      .on('error', gutil.log)
      .pipe(source('bundle.js'))
      .pipe(gulpif(!options.development, streamify(uglify())))
      .pipe(gulp.dest(options.dest))
      .pipe(gulpif(options.development, livereload()))
      .pipe(notify(function () {
        console.log('APP bundle built in ' + (Date.now() - start) + 'ms');
      }));
  };

  // Fire up Watchify when developing
  if (options.development) {
    appBundler = watchify(appBundler);
    appBundler.on('update', rebundle);
  }

  rebundle();

  // We create a separate bundle for our dependencies as they
  // should not rebundle on file changes. This only happens when
  // we develop. When deploying the dependencies will be included
  // in the application bundle
  if (options.development) {

    var testFiles = glob.sync('./specs/**/*-spec.js');
    var testBundler = browserify({
      entries: testFiles,
      debug: true, // Gives us sourcemapping
      transform: [reactify],
      cache: {}, packageCache: {}, fullPaths: true // Requirement of watchify
    });

    dependencies.forEach(function (dep) {
      testBundler.external(dep);
    });

    var rebundleTests = function () {
      var start = Date.now();
      console.log('Building TEST bundle');
      testBundler.bundle()
        .on('error', gutil.log)
        .pipe(source('specs.js'))
        .pipe(gulp.dest(options.dest))
        .pipe(livereload())
        .pipe(notify(function () {
          console.log('TEST bundle built in ' + (Date.now() - start) + 'ms');
        }));
    };

    testBundler = watchify(testBundler);
    testBundler.on('update', rebundleTests);
    rebundleTests();

    // Remove react-addons when deploying, as it is only for
    // testing
    if (!options.development) {
      dependencies.splice(dependencies.indexOf('react-addons'), 1);
    }

    // Run the vendor bundle
    var start = new Date();
    console.log('Building VENDORS bundle');
    gulp.src([
      './bower_components/jquery/dist/jquery.js',
      './assets/lib/jquery.legacy.min.js',
      './assets/lib/semantic.js',
      './assets/lib/plugins.js',
      './assets/lib/master.js',
    ])
      .pipe(concat('vendors.js'))
      //.pipe(uglify())
      //.pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./public/javascript'))
      .pipe(notify(function () {
        console.log('VENDORS bundle built in ' + (Date.now() - start) + 'ms');
      }));
  }

};

var cssTask = function (options) {
  if (options.development) {
    var run = function () {
      console.log(arguments);
      var start = new Date();
      console.log('Building CSS bundle');
      gulp.src(options.src)
        .pipe(concat('main.css'))
        .pipe(gulp.dest(options.dest))
        .pipe(gulpif(options.development, livereload()))
        .pipe(notify(function () {
          console.log('CSS bundle built in ' + (Date.now() - start) + 'ms');
        }));
    };
    run();
    gulp.watch(options.src, run);
  } else {
    gulp.src(options.src)
      .pipe(concat('main.css'))
      .pipe(cssmin())
      .pipe(gulp.dest(options.dest));
  }
};

var htmlTask = function (options) {
  var run = function () {
    gulp.src(options.src)
      .pipe(livereload());
  };
  gulp.watch(options.src, run);
};


gulp.task('images', function () {
  gulp.src('./assets/images/**/*')
    .pipe(gulp.dest('./public/images'));
});

// Fonts
gulp.task('fonts', function () {

  // font-awesome
  gulp.src([
    './bower_components/font-awesome/fonts/*.*'])
    .pipe(gulp.dest('./public/fonts'));

  // flat-ui
  gulp.src([
    './bower_components/flat-ui/dist/fonts/**/*'])
    .pipe(gulp.dest('./public/fonts'));
});

// copy
gulp.task('copy', function () {

  // copy-flat-ui-css-map
  gulp.task('copy-flat-ui-css-map', function () {
    return gulp.src([
      './bower_components/flat-ui/dist/css/flat-ui.css.map'])
      .pipe(gulp.dest('./public/css'));
  });

  // fix-ie
  gulp.task('copy-fix-ie', function () {
    return gulp.src([
      './assets/js/html5shiv.js',
      './assets/js/respond.min.js'])
      .pipe(gulp.dest('./public/js'));
  });

});


gulp.task('lint', function () {
  return gulp.src([
    './gulpfile.js',
    './assets/javascript/**/*.js'
  ])
    .pipe(react())
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

var doRun = function (development) {

  //browserifyTask({
  //  development: development,
  //  src: './assets/javascript/index.js',
  //  dest: './public/javascript/'
  //});

  cssTask({
    development: development,
    src: [
      './bower_components/bootstrap/dist/css/bootstrap.css',
      './bower_components/flat-ui/dist/css/flat-ui.css',
      './assets/css/fix-flat-ui.css',
      './assets/css/style.css',
      './assets/css/style-*.css',
      './bower_components/font-awesome/css/font-awesome.css'
    ],
    dest: './public/css'
  });

  htmlTask({
    src: './templates/**/*'
  });
};

// Starts our development workflow
//gulp.task('default', ['lint', 'fonts', 'images', 'semantic-theme'], function () {
//  var development = true;
//  doRun(development);
//});

gulp.task('build', ['fonts', 'images', 'copy'], function () {
  var development = true;
  doRun(development);
});
