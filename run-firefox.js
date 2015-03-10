var async = require('async');
var _ = require('underscore');
var fs = require('fs');
var data = JSON.parse(fs.readFileSync('./data/chrome/chrome-partial.json', {encoding: 'utf8'}));

//data.length = 2;

function scrape(tab, callback) {
  var id = tab.url.split('/').pop();

  async.parallel([
    function(callback) {
      // category
      // tab.DOM.querySelector('span.webstore-O-P-Oe-Hb .webstore-O-P-i', function(err, result) {
      tab.DOM.querySelector('.webstore-O-P-i', function(err, result) {
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
      // # of users
      tab.DOM.querySelector('.webstore-O-P-jf', function(err, result) {
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
    // console.log(result);
    // console.log("in scrape, after parallel");
    var script = 'document.querySelector("span.webstore-Vb-nd-bc-C-uh:nth-child(5)").textContent';
    tab.Console.evaluateJS(script, function(err, resp) {
      if (err) callback(err);
      // console.log(resp);
      var _results = {
        category: result[0],
        users: result[1],
        updates: resp.result,
        id: id
      };
      callback(null, _results);
    });
  });
}

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
        var tasks = _.map(data, function(item, i) {
          return function(callback) {
            console.log("[%d/%d]\t%s (%s)", (i+1), data.length, item.name, item.id);
            tab.navigateTo(item.url, function() {

              setTimeout(function() {
                // console.log("running scrape...");
                scrape(tab, function(err, results) {
                  // console.log("in scrape callback");
                  if (err) throw err;
                  callback(null, results);
                });
              }, 4000);
            });
          }
        });

        async.series(tasks, function(err, results) {
          var resultsGrouped = _.groupBy(results, 'id');
          var dataGrouped = _.groupBy(data, 'id');
          var final = _.map(resultsGrouped, function(result, id) {
            return _.extend(result[0], dataGrouped[id][0]);
          });

          console.log(final);

          fs.writeFile('./data/chrome/complete.json', JSON.stringify(final), {encoding: 'utf8'}, function(err) {
            var msg;
            if (err) {
              msg = err;
            }
            else {
              msg = 'Finished collecting: '+ results.length;
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
