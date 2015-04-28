gcpug.tw
========

> [Google Cloud Platform User Group Taiwan](http://gcpug.tw/) official site

Setup 1: install python requirement libraries

```python
pip install -r requirements.txt -t lib
```

Setup 1: install front-end development tool
-------------------------------------------

```sh
// install node packages
npm install

// install bower packages
bower install
```

Setup 2: Build font-end assets
------------------------------

modify `gulpfile.js` and set `var development = false;` to build production assets

```javascript
...

gulp.task('build', ['fonts', 'images', 'copy'], function () {
  var development = false;
  doRun(development);
});
```

then execute

```sh
gulp build
```

Setup 3: setup gitkit (google identity toolkit)
-----------------------------------------------

visit [cage1016/gitkit-webapp2](https://github.com/cage1016/gitkit-webapp2) to checkout detial setup steps.
