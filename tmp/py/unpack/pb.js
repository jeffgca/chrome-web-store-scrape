'use strict';

var pb = { };
pb.local = { };
pb.browserState = 'active';

pb.www = 'https://www.pushbullet.com';
pb.api = 'https://api.pushbullet.com';
pb.ws = 'wss://stream.pushbullet.com/websocket';
pb.stream = 'https://stream.pushbullet.com/streaming';
pb.andrelytics = 'https://zebra.pushbullet.com';

pb.isOpera = navigator.userAgent.indexOf('OPR') >= 0;

pb.rollingLog = [];
pb.log = function(message) {
    var line;
    if (message instanceof Object || message instanceof Array) {
        line = message;
    } else {
        line = new Date().toLocaleString() + ' - ' + message;
    }

    console.log(line);
    pb.rollingLog.push(JSON.stringify(line));

    if (pb.rollingLog.length > 400) {
        pb.rollingLog.shift();
    }
};

if (window.chrome) {
    pb.version = parseInt(chrome.runtime.getManifest().version);
    pb.browserVersion = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);

    if (pb.isOpera) {
        pb.userAgent = 'PushBullet Opera Extension '  + pb.version + ' / (Opera ' + pb.browserVersion + ')';
    } else {
        pb.userAgent = 'PushBullet Chrome Extension '  + pb.version + ' / (Chrome ' + pb.browserVersion + ')';
    }
} else if (window.safari) {
    pb.version = parseInt(safari.extension.bundleVersion);
    pb.browserVersion = parseInt(window.navigator.appVersion.match(/Version\/(\d+)\./)[1], 10);
    pb.userAgent = 'Pushbullet Safari Extension '  + pb.version + ' / (Safari ' + pb.browserVersion + ')';
} else {
    var params = utils.getParams(location.search);

    pb.browserVersion = parseInt(window.navigator.userAgent.match(/Firefox\/(\d+)\./)[1]);
    pb.version = params['version'];
    pb.userAgent = 'Pushbullet Firefox Extension '  + pb.version + ' / (Firefox ' + pb.browserVersion + ')';
}
