var cheerio = require('cheerio');

exports.parser = function parser(txt, callback) {
  try {
    var parsed = cheerio.load(txt);
    var raw = parsed('noscript').html();
    var noscript = cheerio.load(raw);
    // console.log(noscript.html());
    var scraped = {};
    // <span class="webstore-O-P-if" title="2,706,660 users">2,706,660 users</span>
    scraped.usercount = noscript('span.webstore-O-P-if').text();
    scraped.rating = noscript('div.rsw-stars').attr('g:rating_override');
    // console.log(//);
    callback(null, scraped);
  } catch(e) {
    callback(e);
  }
};