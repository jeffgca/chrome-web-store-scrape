var phantom = require('phantom');
var async = require('async');
var _ = require('underscore');
var fs = require('fs');
// var url = 'https://chrome.google.com/webstore/detail/jsonview/chklaanhfefbnpoihckbnefhakgolnmc?id=achiogecogbafnpepmdkfdlmkkpkmfcj';
var data = JSON.parse(fs.readFileSync('./data/chrome/chrome-partial.json', {encoding: 'utf8'}));

data.length = 1;

function scrape(tab, callback) {
  async.parallel([
    function(callback) {
      tab.DOM.querySelector('span.webstore-O-P-Oe-Hb .webstore-O-P-i', function(err, result) {
        // if (err) throw err;
        if (!result) {
          callback(null, 'NORESULT')
        }
        else {
          callback(null, result.getAttribute('aria-label'));  
        }
      });
    },
    function(callback) {
      tab.DOM.querySelector('span.webstore-O-P-Oe-Hb .webstore-O-P-if', function(err, result) {
        // if (err) throw err;
        if (!result) {
          callback(null, 'NORESULT')
        }
        else {
          callback(null, result.getAttribute('title'));  
        }
      });
    }
  ], function(err, result) {
    console.log(result);
    var script = 'document.querySelector(".webstore-qb-Vb-nd-bc-C-rh-sh").textContent';
    tab.Console.evaluateJS(script, function(err, resp) {
      if (err) callback(err);
      var _results = {
        category: result[0],
        users: result[1],
        updates: resp.result
      };
      callback(null, _results);
    });
  });
}

var compiled = [];

function notify(msg) {
  var me = 'shlV6I4eGqpQ7PKUmBPuK4wvS3aVq2';
  var app = 'awRtV1oncpNkss9pdBdmP6ALcoQgaP';
  var push = require('pushover-notifications');

  var p = new push( {
      user: me,
      token: app,
      // onerror: function(error) {},
      // update_sounds: true // update the list of sounds every day - will
      // prevent app from exiting.
  });

  p.send(msg);
}

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
              }, 5000);
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
            var msg;
            if (err) {
              msg = err;
            }
            else {
              msg = 'Finished collecting: '+ compiled.length;
            }

            console.log("ALL DONE: "+msg);
            end(msg);
          });
        })
      });
    });
  });
}

function end(msg) {
  async.series([
    function(callback) {
      notify({
        message: msg,   // required
        title: 'Finished Scrape',
        sound: 'magic',
        device: 'OnePlusOne',
        priority: 1
      });
      callback(null);
    },
  ], function() {
    client.disconnect();
    process.exit();
  });
}
