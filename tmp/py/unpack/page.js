'use strict';

if (!self.port && !window.chrome && !window.safari) {
    throw new Error('Shouldn\'t be here');
}

window.pb = { 'page': { } };

var getSmsLength = function(v) { return v.replace(/([{}\[\]\\|\^~€])/g, "\\$1").replace(/\n/g, "--").length };

var setUpBackgroundPage = function(bg) {
    pb.browserVersion = bg.pb.browserVersion;
    pb.version = bg.pb.version;
    pb.www = bg.pb.www;
    pb.api = bg.pb.api;
    pb.local = bg.pb.local;
    pb.openTab = bg.pb.openTab;
    pb.sendPush = bg.pb.sendPush;
    pb.sendReply = bg.pb.sendReply;
    pb.signOut = bg.pb.signOut;
    pb.log = bg.pb.log;
    pb.rollingLog = bg.pb.rollingLog;
    pb.track = bg.pb.track;
    pb.loadOptions = bg.pb.loadOptions;
    pb.dispatchEvent = bg.pb.dispatchEvent;
    pb.snooze = bg.pb.snooze;
    pb.unsnooze = bg.pb.unsnooze;
    pb.getPhonebook = bg.pb.getPhonebook;
    pb.getSmsLength = getSmsLength;
    pb.popOutPanel = bg.pb.popOutPanel;
};

var setUpForegroundPage = function(pb, data, dispatcher) {
    pb.browserVersion = data.browserVersion;
    pb.version = data.version;
    pb.www = data.www;
    pb.api = data.api;
    pb.local = data.local;
    pb.getSmsLength = getSmsLength;

    pb.openTab = function(url) {
        dispatcher('open_tab', { 'url': url });
    };

    pb.sendPush = function(push) {
        dispatcher('push', push);
    };

    pb.sendReply = function(push, message) {
        if (window.safari) {
            // This shouldn't be necessary since dispatcher == safari.self.tab.dispatchMessage
            // but it doesn't wrk. Figure it out later.
            safari.self.tab.dispatchMessage('send_reply', { 'push': push, 'message': message });
        } else {
            dispatcher('send_reply', { 'push': push, 'message': message });
        }
    };

    pb.signOut = function() {
        dispatcher('sign_out');
    };

    pb.log = function(message) {
        console.log(message);
    };

    pb.track = function(event) {
        dispatcher('event', event);
    };

    pb.loadOptions = function() {
        dispatcher('load_options');
    };

    pb.snooze = function() {
        dispatcher('snooze');
    };

    pb.unsnooze = function() {
        dispatcher('unsnooze');
    };
};

var onload = function() {
    onload = undefined; // WTF Safari?

    if (window.chrome) {
        var bg = chrome.extension.getBackgroundPage();

        setUpBackgroundPage(bg);

        pb.getActiveTab = function(done) {
            chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, function(tabs) {
                var tab = tabs[0];
                done(tab);
            });
        };

        window.init();

        pb.dispatchEvent('active');
    } else if (window.safari) {
        if (safari.extension.globalPage) {
            var gp = safari.extension.globalPage.contentWindow;

            setUpBackgroundPage(gp);

            pb.getActiveTab = function(done) {
                var activeTab = safari.application.activeBrowserWindow.activeTab;
                done({
                    'title': activeTab.title,
                    'url': activeTab.url
                });
            };

            window.init();

            pb.dispatchEvent('active');
        } else {
            safari.self.addEventListener('message', function(e) {
                if (e.name != 'page_data') {
                    return;
                }

                var proxy = safari.self.tab;

                setUpForegroundPage(pb, e.message, proxy.dispatchMessage);

                pb.getActiveTab = function(done) {
                    var listener = function(tab) {
                        if (e.name == 'active_tab') {
                            done(e.message);
                            safari.self.removeEventListener('message', listener, false);
                        }
                    };

                    safari.self.addEventListener('message', listener, false);
                    proxy.dispatchMessage('get_active_tab');
                };

                proxy.dispatchMessage('active');

                window.init();
            }, false);

            safari.self.tab.dispatchMessage('page_init');
        }
    } else {
        self.port.on('page_data', function(data) {
            setUpForegroundPage(pb, data, self.port.emit);

            pb.getActiveTab = function(done) {
                var listener = function(tab) {
                    self.port.removeListener('active_tab', listener);
                    done(tab);
                };

                self.port.on('active_tab', listener);
                self.port.emit('get_active_tab');
            };

            pb.getPhonebook = function(device, done) {
                var listener = function(phonebook) {
                    self.port.removeListener('phonebook', listener);
                    done(phonebook);
                };

                self.port.on('phonebook', listener);
                self.port.emit('get_phonebook', device);
            };

            self.port.emit('active');

            window.init();
        });

        self.port.emit('page_init');
    }
};

window.onerror = function(message, file, line, column, error) {
    pb.track({
        'name': 'error',
        'stack': error ? error.stack : file + ':' + line + ':' + column,
        'message': message
    });
};

if (window.chrome || window.safari) {
    document.addEventListener('DOMContentLoaded', onload);
} else {
    onload();
}
