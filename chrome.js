var phantom = require('phantom');
var async = require('async');
var _ = require('underscore');
var fs = require('fs');
var url = 'https://chrome.google.com/webstore/detail/jsonview/chklaanhfefbnpoihckbnefhakgolnmc?id=achiogecogbafnpepmdkfdlmkkpkmfcj';
var request = require('request');
var express = require('express'), 
    app = express();

debugger;
// var phantom = require('phantom');

var parser = require('./parser').parser;
var data = JSON.parse(fs.readFileSync('./data/chrome/chrome-partial.json', {encoding: 'utf8'}));

// data.length = 2;

function scrape(set, done) {
  phantom.create(function (ph) {
    var functions = _.map(set, function(item, i) {
      return function(callback) {
        ph.createPage(function (page) {
          page.set('onLoadFinished', function(success) {
          });

          page.set('onUrlChanged', function(targetUrl) {
            // console.log('New URL: ' + targetUrl);
            console.log("Loading item %d of %d: %s.", (i+1), set.length, item.name);
          });

          page.set('onCallback', function(result) {
            callback(null, result);
          });

          page.set('onConsoleMessage', function (msg) {
            console.log("Phantom Console: " + msg)
            // combined.push(msg);
          });

          page.open(item.url, function() {
            page.evaluate(function() {
              var onNavigate = function() {
                var s = document.querySelector('.webstore-Qf-P');
                var category = s.querySelector('span.webstore-O-P-Oe-Hb .webstore-O-P-i').textContent;
                var strUsers = s.querySelector('span.webstore-O-P-Oe-Hb .webstore-O-P-if').textContent;
                var strUpdated = s.querySelector('.webstore-qb-Vb-nd-bc-C-rh-sh').textContent;
                var id = document.location.href.split('/').pop();

                return {
                  category: category,
                  strUsers: strUsers,
                  strUpdated: strUpdated,
                  id: id
                };
              }
              setTimeout(function() {
                window.callPhantom(onNavigate());
              }, 2000);
            });
          });
        });
      }
    });

    async.series(functions, function(err, results) {
      if (err) throw err;
      // console.log(results);
      ph.exit();

      var __dict = _.groupBy(results, 'id');
      var __dict2 = _.groupBy(set, 'id');
      var mapped = _.map(__dict, function(data, id) {
        return _.extend(__dict2[id][0], __dict[id][0]); // goddammit groupBy
      });

      console.log(mapped);
      
      done(mapped);

      // fs.writeFile('./data/chrome/chrome-complete.json', JSON.stringify(mapped), {encoding: 'utf8'}, function(err) {
      //   if (err) throw err;

      // });
      
    });
  });
}

if (!module.parent) {

  var argv = require('optimist')
      .usage('node chrome.js -s 0 -l 10')
      // .demand(['s', 'l'])
      .argv;

  console.log(argv.s, argv.l);

  var selected = data.splice(argv.s, (argv.s+argv.l));
  // selected.length = 2;
  scrape(selected, function(result) {
    console.log("got result");
    console.log(result);

    fs.writeFile('./data/chrome/chrome-complete.json', JSON.stringify(result), {encoding: 'utf8'}, function(err) {
      if (err) throw err;
      console.log("wrote file");
    });
  });
}


