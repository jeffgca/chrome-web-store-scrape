'use strict';

if (window.chrome) {
    chrome.idle.onStateChanged.addListener(function(newState) {
        pb.log('Chrome state changed to ' + newState);
        pb.browserState = newState;
    });
} else if (window.safari) {
    safari.application.addEventListener('message', function(e) {
        if (e.name == 'page_init') {
            e.target.page.dispatchMessage('page_data', {
                'browserVersion': pb.browserVersion,
                'version': pb.version,
                'www': pb.www,
                'api': pb.api
            });
        } else if (e.name == 'send_reply') {
            pb.sendReply(e.message.push, e.message.message);
        } else if (e.name == 'get_active_tab') {
            var activeTab = safari.application.activeBrowserWindow.activeTab;
            e.target.page.dispatchMessage('active_tab', {
                'title': activeTab.title,
                'url': activeTab.url
            });
        } else if (e.name == 'open_tab') {
            pb.openTab(e.message.url);
        } else if (e.name == 'push') {
            pb.sendPush(push);
        } else if (e.name == 'sign_out') {
            pb.signOut();
        } else if (e.name == 'event') {
             pb.track(e.message);
        } else if (e.name == 'load_options') {
            pb.loadOptions();
        } else if (e.name == 'active') {
            pb.dispatchEvent('active');
        } else if (e.name == 'api_key') {
            if (!localStorage.apiKey) {
                localStorage.apiKey = e.message.apiKey;
            }
        }
    }, false);

    safari.application.addEventListener('popover', function(e) {
        if (e.target.identifier !== 'toolbar-button') {
            e.target.contentWindow.location.reload();
        }
    }, true);
} else {
    self.port.on('page_init', function() {
        self.port.emit('page_data', {
            'browserVersion': pb.browserVersion,
            'version': pb.version,
            'www': pb.www,
            'api': pb.api,
            'local': pb.local,
            'rollingLog': pb.rollingLog,
            'onboardingLink': pb.onboardingLink
        });
    });

    self.port.on('push', function(push) {
        pb.sendPush(push);
    });

    self.port.on('send_reply', function(reply) {
        pb.sendReply(reply.push, reply.message);
    });

    self.port.on('event', function(event) {
        pb.track(event);
    });

    self.port.on('active', function() {
        pb.dispatchEvent('active');
    });

    self.port.on('load_options', function() {
        pb.loadOptions();
    });

    self.port.on('snooze', function() {
        pb.snooze();
    });

    self.port.on('unsnooze', function() {
        pb.unsnooze();
    });

    self.port.on('sign_out', function() {
        pb.signOut();
    });

    self.port.on('get_phonebook', function(device) {
        pb.getPhonebook(device, function(response) {
            self.port.emit('phonebook', response);
        });
    });

    self.port.on('get_notifications', function(device) {
        self.port.emit('notifications', pb.notifier.active);
    });
}

pb.eventListeners = [];

pb.addEventListener = function(eventName, listener) {
    pb.eventListeners.push({ 'eventName': eventName, 'listener': listener });
    window.addEventListener(eventName, listener, false);
};

pb.clearEventListeners = function() {
    var eventListeners = [];
    var dontRemove = ['signed_in', 'signed_out'];
    pb.eventListeners.map(function(eventListener) {
        if (dontRemove.indexOf(eventListener.eventName) == -1) {
            window.removeEventListener(eventListener.eventName, eventListener.listener, false);
        } else {
            eventListeners.push(eventListener);
        }
    });

    pb.eventListeners = eventListeners;
};

pb.dispatchEvent = function(eventName, details) {
    if (window.chrome || window.safari) {
        window.dispatchEvent(new CustomEvent(eventName, { 'detail': details }));
    } else {
        var detail;
        if (pb.browserVersion >= 30) {
            detail = cloneInto({ 'detail': details }, document.defaultView);
        } else {
            detail = { 'detail': details };
        }
        window.dispatchEvent(new CustomEvent(eventName, detail));
    }
};

pb.updateIcon = function() {
    if (window.chrome) {

        var snoozed = pb.options.snoozedUntil > Date.now();
        if (snoozed) {
            chrome.browserAction.setBadgeText({
                'text': 'zzz'
            });

            if (pb.options.useDarkIcon) {
                chrome.browserAction.setBadgeBackgroundColor({ 'color': '#76C064' });
            } else {
                chrome.browserAction.setBadgeBackgroundColor({ 'color': '#4A4A4A' });
            }
        } else {
            var count = Object.keys(pb.notifier.active).length;

            chrome.browserAction.setBadgeText({
                'text': (count > 0 && pb.options.showNotificationCount) ? '' + count : ''
            });

            if (pb.options.useDarkIcon) {
                chrome.browserAction.setBadgeBackgroundColor({ 'color': '#4ab367' });
            } else {
                chrome.browserAction.setBadgeBackgroundColor({ 'color': '#e85845' });
            }
        }

        if (pb.options.useDarkIcon) {
            chrome.browserAction.setIcon({
                'path': {
                    '19': 'icon_19_gray.png',
                    '38': 'icon_38_gray.png'
                }
            });
        } else {
            chrome.browserAction.setIcon({
                'path': {
                    '19': 'icon_19.png',
                    '38': 'icon_38.png'
                }
            });
        }
    }
};

var snoozeTimeout;
pb.loadOptions = function() {
    pb.options = {
        'hideDisableButton': localStorage['hideDisableButton'] == 'true',
        'openMyLinksAutomatically': localStorage['openMyLinksAutomatically'] != 'false',
        'onlyShowTitles': localStorage['onlyShowTitles'] == 'true',
        'useDarkIcon': localStorage['useDarkIcon'] == 'true',
        'playSound': localStorage['playSound'] == 'true',
        'showMirrors': localStorage['showMirrors'] != 'false' || !window.chrome,
        'showContextMenu': localStorage['showContextMenu'] != 'false' || !window.chrome,
        'notificationDuration': parseInt(localStorage['notificationDuration']) || 0,
        'preferLinksOverImages': localStorage['preferLinksOverImages'] == 'true',
        'snoozedUntil': parseInt(localStorage['snoozedUntil']) || 0,
        'allowInstantPush': localStorage['allowInstantPush'] == 'true',
        'instantPushIden': localStorage['instantPushIden'],
        'showNotificationCount': localStorage['showNotificationCount']
    };

    pb.updateIcon();
    pb.updateContextMenu();

    if (pb.options.snoozedUntil > 0) {
        snoozeTimeout = setTimeout(function() {
            delete localStorage.snoozedUntil;
            pb.loadOptions();
        }, pb.options.snoozedUntil - Date.now());
    } else {
        clearTimeout(snoozeTimeout);
    }
};

pb.saveOptions = function() {
    Object.keys(pb.options).map(function(key) {
        localStorage[key] = pb.options[key];
    });

    pb.loadOptions();
};

pb.snooze = function() {
    localStorage.snoozedUntil = Date.now() + (60 * 60 * 1000);
    pb.loadOptions();
};

pb.unsnooze = function() {
    delete localStorage.snoozedUntil;
    pb.loadOptions();
};

pb.showToast = function(text) {
    if (window.chrome) {
        chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, function(tabs) {
            if (tabs && tabs.length > 0) {
                var tab = tabs[0];
                chrome.tabs.sendMessage(tab.id, {
                    'type': 'show_toast',
                    'text': text
                });
            }
        });
    }
};

var tabOnClose = { };
pb.openTab = function(url, onclose) {
    if (window.chrome) {
        chrome.windows.getCurrent({ 'populate': false }, function(window) {
            if (window) {
                chrome.tabs.create({ 'url': url, 'active': true }, function(tab) {
                    if (onclose) {
                        tabOnClose[tab.id] = onclose;
                    }
                    chrome.windows.update(tab.windowId, { 'focused': true }, function() {
                    });
                });
            } else {
                chrome.windows.create({ 'url': url, 'type': 'normal', 'focused': true }, function(window) {
                    window.tabs.map(function(tab) {
                        if (tab.url == url) {
                            tabOnClose[tab.id] = onclose;
                        }
                    });
                });
            }
        });
    } else if (window.safari) {
        var newTab;
        if (safari.application.browserWindows.length > 0) {
            if (safari.application.activeBrowserWindow) {
                newTab = safari.application.activeBrowserWindow.openTab();
            } else {
                newTab = safari.application.openBrowserWindow().activeTab;
            }
        } else {
            newTab = safari.application.openBrowserWindow().activeTab;
        }

        newTab.url = url;
        if (onclose) {
            tabOnClose[newTab] = onclose;
        }
    } else {
        var tabId = Math.floor((Math.random() * 1000) + 1);
        tabOnClose[tabId] = onclose;
        self.port.emit('open_tab', { 'id': tabId, 'url': url });
    }
};

var tabCloseHandler = function(tabId) {
    var onclose = tabOnClose[tabId];
    if (onclose) {
        onclose();
    }
    delete tabOnClose[tabId];
};

if (window.chrome) {
    chrome.tabs.onRemoved.addListener(tabCloseHandler);
} else if (window.safari) {
    safari.application.addEventListener('close', function(e) {
        tabCloseHandler(e.target);
    }, true);
} else {
    self.port.on('tab_closed', tabCloseHandler);
}

pb.signOut = function() {
    pb.track({
        'name': 'signed_out'
    });

    var hasShownSignInNotification = localStorage.hasShownSignInNotification;

    localStorage.clear();

    if (hasShownSignInNotification) {
        localStorage.hasShownSignInNotification = hasShownSignInNotification;
    }

    pb.local = { };

    pb.saveOptions();

    if (window.chrome) {
        chrome.cookies.remove({ 'url': pb.www, 'name': 'api_key' });
    } else if (window.safari) {
        // Doesn't use cookies, nothing to do
    } else {
        self.port.emit('signed_out', pb.www);
    }

    pb.dispatchEvent('signed_out');

    pb.clearEventListeners();

    clearTimeout(snoozeTimeout);
};

pb.addEventListener('signed_in', function(e) {
    pb.addEventListener('active', function(e) {
        pb.trackPerHour({
            'name': 'active'
        });
    });

    pb.addEventListener('notifications_changed', function(e) {
        pb.updateIcon();
    });
});

if (window.chrome) {
    var panel = {
        'url': chrome.runtime.getURL('panel.html#popout'),
        'type': 'detached_panel',
        'width': 440,
        'height': 400,
        'focused': true
    };

    pb.popOutPanel = function() {
        chrome.windows.create(panel, function() {
            pb.log('Opening panel in a popout');
        });
    };
}
