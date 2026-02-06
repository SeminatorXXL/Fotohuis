const minify = require('express-minify');
const uglifyJS = require('uglify-js');
const cleanCSS = require('clean-css');

module.exports = minify({
  js_match: /\.js$/,
  css_match: /\.css$/,
  uglifyJS: {
    compress: true,
    mangle: true,
  },
  cache: false, // Zet op true in productie
  js_minifier: function (file, callback) {
    try {
      const result = uglifyJS.minify(file);
      if (result.error) throw result.error;
      callback(null, result.code);
    } catch (err) {
      console.error(`❌ Fout bij minify van JS:`, err);
      callback(err);
    }
  },
  css_minifier: function (file, callback) {
    try {
      const output = new cleanCSS({}).minify(file);
      if (output.errors.length) throw output.errors;
      callback(null, output.styles);
    } catch (err) {
      console.error(`❌ Fout bij minify van CSS:`, err);
      callback(err);
    }
  }
});

const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../public/css/style.css');
fs.readFile(cssPath, 'utf8', (err, data) => {
  const output = new cleanCSS({}).minify(data);
});
