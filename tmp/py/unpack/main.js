'use strict';

pb.addEventListener('signed_out', function(e) {
    main();
});

var main = function() {
    var lastVersion = localStorage.lastVersion;

    transitionLocalStorage();

    pb.loadOptions();

    var showForChrome = window.chrome && !pb.isOpera && lastVersion && lastVersion < 175;
    var showForOpera = window.chrome && pb.isOpera && lastVersion && lastVersion < 168;
    var showForSafari = window.safari && lastVersion && lastVersion < 3;
    var showForFirefox = self && self.port && lastVersion < 42;
    if (showForChrome || showForOpera || showForSafari || showForFirefox) {
        var options = {
            'type': 'basic',
            'key': 'updated',
            'title': text.get('updated_notif_title'),
            'message': text.get('updated_notif_message'),
            'iconUrl': 'icon_48.png',
            'onclick': function() {
                var url = (window.safari ? safari.extension.baseURI : '') + 'changelog.html';
                pb.openTab(url);
            }
        };

        pb.notifier.show(options);
    }

    onceWeHaveAnApiKey(function() {
        pb.log('Signed in with API key ' + pb.local.apiKey);

        onceWeHaveTheUser(function() {
            pb.log('Bootstrapping...');

            pb.dispatchEvent('signed_in'); // This triggers all the things

            pb.updateIcon();
        });
    });

    setTimeout(function() {
        reportAlive();
    }, 30 * 1000);
};

var onceWeHaveTheUser = function(done) {
    utils.untilWithBackoff(
        function() {
            return !!pb.local.user;
        },
        function(next) {
            if (localStorage.user) {
                pb.local.user = JSON.parse(localStorage.user);
                next();
            } else {
                pb.get(pb.api + '/v2/users/me', function(user) {
                    if (user) {
                        pb.local.user = user;
                        localStorage.user = JSON.stringify(user);
                    }
                    next();
                });
            }
        },
        function() {
            done();
        }
    );
};

var onceWeHaveAnApiKey = function(done) {
    var processPollResult = function(apiKey, next) {
        if (apiKey && apiKey.length > 0 && apiKey != 'undefined') {
            localStorage.apiKey = apiKey;
            localStorage.api_key = localStorage.apiKey;
            pb.local.apiKey = apiKey;
        } else {
            if (localStorage.hasShownSignInNotification != 'true') {
                localStorage.hasShownSignInNotification = true;

                var options = {
                    'type': 'basic',
                    'key': 'installed',
                    'title': text.get('thanks_for_installing_title'),
                    'message': text.get('thanks_for_installing_message'),
                    'iconUrl': 'icon_48.png',
                    'onclick': function() {
                        pb.openTab(pb.www + '/signin');
                    }
                };

                pb.notifier.show(options);
            }
        }

        next();
    };

    utils.until(
        function() {
            return !!pb.local.apiKey;
        }, function(next) {
            if (localStorage.apiKey && localStorage.apiKey != 'undefined') {
                pb.local.apiKey = localStorage.apiKey;
                next();
            } else {
                if (window.chrome) {
                    chrome.cookies.get({ 'url': pb.www, 'name': 'api_key' }, function(cookie) {
                        utils.wrap(function() {
                            if (cookie && cookie.value.length > 0) {
                                var apiKey = cookie.value;
                                processPollResult(apiKey, next);
                            } else {
                                processPollResult(null, next);
                            }
                        });
                    });
                } else if (window.safari) {
                    processPollResult(localStorage.apiKey, next);
                } else {
                    var callback = function(apiKey) {
                        self.port.removeListener('api_key', callback);
                        processPollResult(apiKey, next);
                    };

                    self.port.on('api_key', callback);
                    self.port.emit('request_api_key', pb.www);
                }
            }
        }, function() {
            done();
        }
    );
};

var transitionLocalStorage = function() {
    if (!localStorage.lastVersion
        || (window.chrome && localStorage.lastVersion < 162)
        || (window.safari && localStorage.lastVersion < 3)
        || (self.port && localStorage.lastVersion < 42)) {

        var apiKey = localStorage.apiKey || localStorage.api_key;
        var hasShownSignInNotification = localStorage.hasShownSignInNotification;

        pb.loadOptions();

        localStorage.clear();

        if (apiKey && apiKey != 'undefined') {
            localStorage.apiKey = apiKey;
        }

        if (hasShownSignInNotification) {
            localStorage.hasShownSignInNotification = hasShownSignInNotification;
        }

        pb.saveOptions();
    }

    if (localStorage.lastVersion < 175 && (!localStorage.apiKey || localStorage.apiKey == 'undefined')) {
        delete localStorage.hasShownSignInNotification;
    }

    localStorage.lastVersion = pb.version;
};

main();

setInterval(function() {
    reportAlive();
}, 1 * 60 * 60 * 1000);

var reportAlive = function() {
    pb.trackPerDay({
        'name': 'alive',
        'signed_in': !!localStorage.apiKey
    });
};
