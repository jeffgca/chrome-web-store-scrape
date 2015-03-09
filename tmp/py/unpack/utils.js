'use strict';

window.utils = { };

utils.TAB = 9;
utils.ENTER = 13;
utils.ESC = 27;
utils.UP_ARROW = 38;
utils.DOWN_ARROW = 40;

utils.until = function(test, poll, done) {
    until(test, poll, done, 5000, 5000);
};

utils.untilWithBackoff = function(test, poll, done) {
    until(test, poll, done, 5000, 10 * 60 * 1000);
};

var until = function(test, poll, done, interval, maxBackoff) {
    var run = function(timeout) {
        if (test()) {
            done();
        } else {
            poll(function() {
                if (test()) {
                    done();
                } else {
                    setTimeout(function() {
                        run(Math.min(timeout * 2, maxBackoff));
                    }, timeout);
                }
            });
        }
    };

    run(interval);
};

utils.wrap = function(func) {
    try {
        func();
    } catch(e) {
        pb.track({
            'name': 'chrome_error',
            'stack': e.stack,
            'message': e.message
        });
        throw e;
    }
};

utils.getParams = function(search) {
    var parse = function(params, pairs) {
        var pair = pairs[0];
        var parts = pair.split('=');
        var key = decodeURIComponent(parts[0]);
        var value = decodeURIComponent(parts.slice(1).join('='));

        // Handle multiple parameters of the same name
        if (typeof params[key] === 'undefined') {
            params[key] = value;
        } else {
            params[key] = [].concat(params[key], value);
        }

        return pairs.length == 1 ? params : parse(params, pairs.slice(1));
    };

    // Get rid of leading ?
    return search.length == 0 ? {} : parse({}, search.substr(1).split('&'));
};

utils.base64ToBlob = function(base64Data, type) {
    var sliceSize = 1024;
    var byteCharacters = atob(base64Data);
    var bytesLength = byteCharacters.length;
    var slicesCount = Math.ceil(bytesLength / sliceSize);
    var byteArrays = new Array(slicesCount);

    for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        var begin = sliceIndex * sliceSize;
        var end = Math.min(begin + sliceSize, bytesLength);

        var bytes = new Array(end - begin);
        for (var offset = begin, i = 0 ; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }

    return new Blob(byteArrays, { type: type });
};

utils.imageNameFromUrl = function(url) {
    if (url.substring(0, 4) == 'data') {
        var type = url.split(';')[0].split(':')[1];
        var now = new Date();
        return 'Image_' + now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate()
               + '-' + now.getHours() + '-' + now.getMinutes() + '-' + now.getSeconds() + '.' + type.split('/')[1];
    } else {
        return url.split('/').pop().split('?')[0].split(':')[0];
    }
};

utils.uuid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);
    });
}

String.format = function(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number - 1] != 'undefined' ? args[number - 1] : match;
    });
};
