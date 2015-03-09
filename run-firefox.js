var phantom = require('phantom');
var async = require('async');
var _ = require('underscore');
var fs = require('fs');
// var url = 'https://chrome.google.com/webstore/detail/jsonview/chklaanhfefbnpoihckbnefhakgolnmc?id=achiogecogbafnpepmdkfdlmkkpkmfcj';
var data = JSON.parse(fs.readFileSync('./data/chrome/chrome-partial.json', {encoding: 'utf8'}));

data.length = 5;

function scrape(tab, callback) {
  var category = tab.DOM.querySelector('.webstore-O-P-i');

  var selectors = {
    category: 'span.webstore-O-P-Oe-Hb .webstore-O-P-i',
    users:    'span.webstore-O-P-Oe-Hb .webstore-O-P-if'
    // updates:  '.webstore-qb-Vb-nd-bc-C-rh-sh'
  };

  var tasks = _.map(selectors, function(selector, name) {
    return function(cb) {
      tab.DOM.querySelector(selector, function(err, result) {
        if (err) throw err;
        if (name === 'category') {
          cb(null, result.getAttribute('aria-label'));
        }
        else if (name === 'users') {
          cb(null, result.getAttribute('title')); 
        }
        else if (name === 'updates') {
          
        }
        else {
          cb(null, null);
        }
      });
    } 
  })

  async.parallel(tasks, function(err, results) {
    tab.Console.evaluateJS('document.querySelector(".webstore-qb-Vb-nd-bc-C-rh-sh").textContent', function(err, resp) {
      _results = {
        category: results[0],
        users: results[1],
        updates: resp.result
      };
      callback(null, _results);
    });
  });
}

var compiled = [];

if (!module.parent) {  
  var FirefoxClient = require('firefox-client');
  var utils = require('firefox-client/test/utils');

  var client = new FirefoxClient();

  client.connect(6010, function() {
    client.listTabs(function(err, tabs) {
      if (err) throw err;
      if (tabs.length < 1) throw "no tabs open???";
      var tab = tabs[0];

      tab.attach(function() {
        var tasks = _.map(data, function(item) {
          return function(callback) {
            tab.navigateTo(item.url, function() {
              console.log("navigated to", item.url);
              setTimeout(function() {
                callback(null);
              }, 6000);
            });
          }
        });

        tab.on('navigate', function(event) {
          setTimeout(function() {
            scrape(tab, function(err, results) {
              if (err) throw err;
              console.log(results);
              compiled.push(results);
            });
          }, 3000);
        });

        async.series(tasks, function(err, results) {
          console.log("finished", compiled);
          fs.writeFile('./data/chrome/foo.json', JSON.stringify(compiled), {encoding: 'utf8'}, function(err) {
            if (err) throw err;
            console.log("ALL DONE");
          });
        })
      });
    });
  });
}
