'use strict';

var getHeaders = function() {
    return {
        'X-User-Agent': pb.userAgent,
        'API-Version': '2014-05-07',
        'Authorization': 'Bearer ' + pb.local.apiKey,
        'Accept': 'application/json'
    };
};

var onResponse = function(status, body, done) {
    if (status == 200) {
        try {
            done(JSON.parse(body));
        } catch (e) {
            console.log(e);
            done();
        }
    } else if (status === 401) {
        pb.signOut();
    } else {
        done();
    }
};

pb.get = function(url, done) {
    pb.log('GET ' + url);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    xhr.timeout = 30000;
    xhr.ontimeout = function() {
        onResponse(0, null, done);
    };

    var headers = getHeaders();
    Object.keys(headers).map(function(key) {
        xhr.setRequestHeader(key, headers[key]);
    });

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            onResponse(xhr.status, xhr.responseText, done);
        }
    };

    xhr.send();
};

pb.del = function(url, done) {
    pb.log('DELETE ' + url);

    var xhr = new XMLHttpRequest();
    xhr.open('DELETE', url, true);

    xhr.timeout = 30000;
    xhr.ontimeout = function() {
        onResponse(0, null, done);
    };

    var headers = getHeaders();
    Object.keys(headers).map(function(key) {
        xhr.setRequestHeader(key, headers[key]);
    });

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            onResponse(xhr.status, xhr.responseText, done);
        }
    };

    xhr.send();
};

pb.post = function(url, object, done) {
    pb.log('POST ' + url);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    var headers = getHeaders();
    Object.keys(headers).map(function(key) {
        xhr.setRequestHeader(key, headers[key]);
    });

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            onResponse(xhr.status, xhr.responseText, done);
        }
    };

    xhr.send(JSON.stringify(object));
};
