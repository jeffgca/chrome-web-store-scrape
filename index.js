var phantom = require('phantom'),
    fs = require('fs');

var links = fs.readFileSync('./links.json');
var async = require('async');

// var underscoreJS = require('fs').readFileSync();

var url = 'https://chrome.google.com/webstore/detail/silver-bird/encaiiljifbdbjlphpgpiimidegddhic';

phantom.create(function (ph) {
  ph.createPage(function (page) {
    page.set('onLoadFinished', function(success) {
      console.log("Loaded "+url);
    });

    page.set('onUrlChanged', function(targetUrl) {
      console.log('New URL: ' + targetUrl);
    });

    page.set('onCallback', function(results) {
      // ph.exit();
      console.log(results);
      page.evaluate(function() {

      });
    });

    page.set('onConsoleMessage', function (msg) {
        console.log("Phantom Console: " + msg)
    });

    page.open(url, function (status) {
      page.injectJs('./client-script.js', function() {
        page.evaluate(function() {
          console.log("in evaluate");
          // onNavigate(function() {

          // });
        })
      });
    });
  });
});