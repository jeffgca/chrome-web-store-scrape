var phantom = require('phantom')
var url = 'https://chrome.google.com/webstore/category/extensions?hl=en-US&utm_source=chrome-ntp-launcher';
var map = function(items, callback) {
  return Array.map.call(items, callback)
}
var request = require('request')
var links = fs.readFileSync('./links.json')
var async = require('async')
var limit = 20

map(links, function(link) {
  return function(callback) {
    request.get(link, function(e, r, b) {
      // if (e) throw e;
      calback(null, b);
    }))
  }
}))

async.parallelLimit(tasks, limit, function() {
  
})

// http://clients2.google.com/service/update2/crx?response=redirect&x=id%3Dchlffgpmiacpedhhbkiomidkjlcfhogd%26uc%26lang%3Den-US&prod=chrome

// https://clients2.google.com/service/update2/crx?response=redirect&prodversion=31.0.1609.0&x=id%3Ddhiaggccakkgdfcadnklkbljcgicpckn%26uc

// https://chrome.google.com/webstore/detail/stravaplus/dhiaggccakkgdfcadnklkbljcgicpckn?hl=en-US
