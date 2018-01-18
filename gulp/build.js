const gulp = require('gulp');
const connect = require('gulp-connect');
const mustache = require('gulp-mustache-plus');
const { getManifest } = require('./revision');
require('./static');
require('./bundle');
require('./webpack');

const getConfig = prefix => ({
    index     : `<script src="js/${prefix ? getManifest(`index${prefix}.js`) : 'index.js'}"></script>`,
    bot       : `<script src="js/${prefix ? getManifest(`bot${prefix}.js`) : 'bot.js'}"></script>`,
    bundle    : `<script src="js/${getManifest('bundle.js')}"></script>`,
    bundle_css: `<link href="css/${getManifest('bundle.css')}" rel="stylesheet" />`,
    index_css : `<link href="css/${getManifest('index.css')}" rel="stylesheet" />`,
    bot_css   : `<link href="css/${getManifest('bot.css')}" rel="stylesheet" />`,
    head      : 'templates/partials/head.mustache',
    security  : 'templates/partials/security.mustache',
    language  : 'templates/partials/language.mustache',
    loading   : 'templates/partials/loading.mustache',
});

const genHtml = min =>
    gulp
        .src('templates/*.mustache')
        .pipe(mustache({}, {}, getConfig(typeof min === 'boolean' ? '.min' : '')))
        .pipe(gulp.dest('www'))
        .pipe(connect.reload());

gulp.task('build-dev-html', genHtml);
gulp.task('build-dev-js', ['webpack-dev'], genHtml);
gulp.task('build-dev-static', ['static'], genHtml);
gulp.task('build-min', ['static', 'webpack-prod', 'bundle-css', 'bundle-js'], () => genHtml(true));
gulp.task('build', ['bundle-css', 'bundle-js', 'build-dev-js', 'build-dev-static']);
