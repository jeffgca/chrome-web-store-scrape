var tiles = $$('.webstore-S-cb')
console.log(tiles.length)

var map = (list, cb) => {
  return Array.prototype.map.call(list, cb);
}

var slice = (list, beginning, end) => {
  return Array.prototype.slice.call(list, beginning, end);
}

var each = (list, cb) => {
  return Array.prototype.forEach.call(list, cb);
}

var _list = slice(tiles, 0, 10);

var links = map(tiles, function(el) {
  var url = el.querySelector('.webstore-S-Bc').href;
  var name = el.querySelector('.webstore-S-kg-cb-Hb').textContent;
  var r = el.querySelector('.rsw-stars'), 
      rating = 0;
  if (r) {
   rating = r.attributes['g:rating_override'].nodeValue;  
  }
  
  var id = url.split('/').pop();
  
  return {
    url: url,
    name: name, 
    rating: rating,
    id: id
  }
});