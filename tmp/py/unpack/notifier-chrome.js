'use strict';

var alertSound;
try {
    alertSound = new Audio('alert.ogg');
} catch (e) {
    alertSound = {
        'play': function() {
            pb.log('Unable to play sound');
        }
    };
}

pb.notifier.notify = function(options, dontNotify) {
    options.created = Date.now();

    if (!listenersSetUp) {
        setUpNotificationListeners();
        listenersSetUp = true;
    }

    var spec = { };
    spec.type = options.type;
    spec.title = options.title || '';
    spec.message = options.message || '';
    spec.iconUrl = options.iconUrl;

    if (options.contextMessage) {
        spec.contextMessage = options.contextMessage;
    }

    if (options.items) {
        spec.items = options.items;
    }

    if (options.imageUrl) {
        spec.imageUrl = options.imageUrl;
    }

    if (!options.priority) {
        if (pb.options.notificationDuration == 0) {
            spec.priority = 2;
            options.priority = spec.priority;
        }
    }

    if (pb.browserVersion > 32) {
        spec.isClickable = true;
    }

    if (options.buttons) {
        if (options.buttons.length > 2) {
            var buttons = options.buttons;
            options.buttons = [];

            var lastButton = buttons.pop();
            options.buttons.push(lastButton);

            var labels = [];
            buttons.map(function(button) {
                labels.unshift(button.short_title || button.title);
            });

            buttons.push(lastButton);

            var title = String.format(text.get('more_actions'), labels.join(', '));

            options.buttons.unshift({
                'title': title,
                'iconUrl': 'ic_action_overflow.png',
                'onclick': function() {
                    options.buttons = buttons;
                    openMore(options);
                }
            });
        }

        spec.buttons = [];
        for (var i = 0, length = options.buttons.length; i < length; i++) {
            var button = options.buttons[i];
            spec.buttons.push({
                'title': button.title,
                'iconUrl': button.iconUrl
            });
        }
    }

    if (pb.isOpera) {
        // No buttons for opera
        delete spec.buttons;
        delete spec.isClickable;
    }

    var moreWindow = moreWindows[options.key];
    if (moreWindow) {
        chrome.windows.remove(moreWindow);
    }

    if (pb.options.snoozedUntil > Date.now()) { // If snoozed
        pb.notifier.active[options.key] = options;
        return;
    }

    chrome.notifications.getAll(function(active) {
        utils.wrap(function() {
            var exists = active && active[options.key];
            var notification = pb.notifier.active[options.key];

            if (exists && notification && (Date.now() - notification.created < getTimeOnScreen(notification))) {
                pb.notifier.active[options.key] = options;

                try {
                    chrome.notifications.update(options.key, spec, function() { });
                } catch (e) {
                    if (e.message.indexOf('contextMessage') >= 0) {
                        delete spec.contextMessage;
                        chrome.notifications.update(options.key, spec, function() { });
                    } else {
                        throw e;
                    }
                }
            } else {
                var notificationCreated = function() {
                    pb.notifier.active[options.key] = options;

                    if (pb.options.playSound) {
                        alertSound.play();
                    }
                };

                var createNotification = function() {
                    try {
                        chrome.notifications.create(options.key, spec, function() {
                            if (chrome.runtime.lastError) {
                                pb.log(chrome.runtime.lastError);
                            }
                            notificationCreated();
                        });
                    } catch (e) {
                        if (e.message.indexOf('contextMessage') >= 0) {
                            delete spec.contextMessage;
                            chrome.notifications.create(options.key, spec, function() {
                                notificationCreated();
                            });
                        } else {
                            throw e;
                        }
                    }
                };

                if (exists && !dontNotify) {
                    notification.onclose = null;
                    chrome.notifications.clear(options.key, function() {
                        createNotification();
                    });
                } else {
                    createNotification();
                }
            }
        });
    });
};

var setUpNotificationListeners = function() {
    chrome.notifications.onClicked.addListener(function(key) {
        utils.wrap(function() {
            var notification = pb.notifier.active[key];

            chrome.notifications.clear(key, function(wasCleared) {
            });

            if (notification) {
                if (notification.onclick) {
                    notification.onclick();
                }
            }
        });
    });

    chrome.notifications.onClosed.addListener(function(key, byUser) {
        utils.wrap(function() {
            var notification = pb.notifier.active[key];
            if (notification) {
                if (notification.onclose) {
                    notification.onclose();
                }
            }

            delete pb.notifier.active[key];
        });
    });

    chrome.notifications.onButtonClicked.addListener(function(key, index) {
        utils.wrap(function() {
            var notification = pb.notifier.active[key];

            chrome.notifications.clear(key, function(wasCleared) {
            });

            if (notification) {
                notification.buttons[index].onclick();

                // https://code.google.com/p/chromium/issues/detail?id=335918
                var timeTillHidden = getTimeOnScreen(notification);
                if (pb.browserVersion > 31 && (Date.now() - notification.created > timeTillHidden)) {
                    chrome.windows.create({
                        'url': 'about:blank',
                        'type': 'popup',
                        'width': 1,
                        'height': 1,
                        'left': -100,
                        'top': -100
                    }, function(window) {
                        chrome.windows.remove(window.id);
                    });
                }
            }
        });
    });
};

pb.notifier.dismiss = function(key) {
    chrome.notifications.clear(key, function(wasCleared) {
        delete pb.notifier.active[key];
        if (wasCleared) {
            pb.log('Dismissed ' + key);
        }
    });

    var moreWindow = moreWindows[key];
    if (moreWindow) {
        chrome.windows.remove(moreWindow);
    }
};

var getTimeOnScreen = function(notification) {
    return notification.priority > 0 ? 25 * 1000 : 8 * 1000;
};

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
// Power the "More" popup
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

var moreWindows = { };
var moreOptions = { };

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type == 'get_more_options') {
        sendResponse(moreOptions[sender.tab.windowId]);
    } else if (message.type == 'click') {
        moreOptions[sender.tab.windowId].buttons[message.button_index].onclick();
        chrome.windows.remove(sender.tab.windowId);
    }
});

chrome.windows.onRemoved.addListener(function(windowId) {
    var options = moreOptions[windowId];
    if (options) {
        delete moreWindows[options.key];
        delete moreOptions[windowId];
    }
});

var openMore = function(options) {
    var width = 360;
    var height = 260;

    // Position the More window based on the platform
    // Mac in top-right, Windows in bottom-right
    var top;
    if (navigator.platform.indexOf('Mac') >= 0) {
        top = 40;
    } else {
        top = window.screen.availHeight - height - 110;
    }

    var left = window.screen.availWidth - width - 20;

    var spec = {
        'type': 'popup',
        'focused': true,
        'url': 'more.html?key=' + options.key,
        'width': width,
        'height': height,
        'top': top,
        'left': left
    };

    chrome.windows.create(spec, function(window) {
        moreWindows[options.key] = window.id;
        moreOptions[window.id] = options;
        chrome.windows.update(window.id, { 'focused': true }, function() {
        });
    });
};
