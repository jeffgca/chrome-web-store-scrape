'use strict';

pb.addEventListener('signed_in', function(e) {
    pb.addEventListener('stream_message', function(e) {
        var message = e.detail;
        if (message.type != 'push') {
            return;
        }

        var push = message.push;

        if (push.source_device_iden && pb.local.device && push.source_device_iden == pb.local.device.iden) {
            return;
        } else if (push.target_device_iden && push.target_device_iden != pb.local.device.iden) {
            return;
        }

        if (push.type == 'mirror' && pb.browserState != 'locked') {
            if (pb.options.showMirrors) {
                showMirror(push);
            } else {
                pb.log('Not showing mirror, disabled in options');
            }
        } else if (push.type == 'dismissal') {
            dismissMirror(push);
        } else if (push.type == 'log_request') {
            pb.log('Log data requested');

            pb.post(pb.api + '/v2/error-report', {
                'reply_to': pb.local.user.email,
                'subject': 'Browser log file requested for ' + pb.local.user.email,
                'body': '',
                'data': pb.rollingLog.join('\n')
            }, function(response) {
            });
        }
    });
});

var showMirror = function(push) {
    pb.log('Mirroring notification for:');
    pb.log(push);

    var options = { };
    options.type = 'basic';
    options.key = getKey(push);
    options.buttons = [];

    options.iconUrl = 'data:image/png;base64,' + push.icon;
    options.title = (push.package_name == 'com.pushbullet.android' ? '' : push.application_name + ': ') + (push.title || '');
    options.message = push.body || '';

    // Merge missed messages together, but dont' for FB Messenger or Telegram who do it themselves
    if (push.conversation_iden && ['org.telegram.messenger', 'com.facebook.orca'].indexOf(push.package_name) == -1) {
        var existing = pb.notifier.active[options.key];
        if (existing) {
            options.message = existing.message + '\n' + options.message;
        }
    }

    var sourceDevice = pb.local.devices[push.source_device_iden];
    if (sourceDevice) {
        options.contextMessage = String.format(text.get('context_message'),
                                               sourceDevice.nickname || sourceDevice.model,
                                               new Date().toLocaleTimeString().replace(/:\d+ /, ' '));
    }

    options.onclick = function() {
        if (push.conversation_iden) {
            openQuickReply(push);
        } else if (push.package_name == 'com.google.android.talk') {
            pb.openTab('https://help.pushbullet.com/articles/why-cant-i-reply-to-hangouts-messages/');
        } else {
            maybeOpenTab(push);
        }

        dismissRemote(push);
    };

    if (!push.conversation_iden && push.package_name != 'com.pushbullet.android') {
        options.buttons.push(muteButton(push));   
    }

    if (push.actions) {
        push.actions.map(function(action) {
            options.buttons.push({
                'title': 'Android: ' + action.label,
                'short_title': action.label,
                'iconUrl': 'ic_action_android.png',
                'onclick': function() {
                    dismissRemote(push, action.trigger_key);
                }
            });
        });
    }

    if (push.conversation_iden || push.package_name == 'com.google.android.talk') {
        options.buttons.push({
            'title': text.get('reply'),
            'iconUrl': 'ic_action_sms.png',
            'onclick': function() {
                options.onclick();
            }
        });
    }

    options.buttons.push({
        'title': text.get('dismiss'),
        'iconUrl': 'ic_action_cancel.png',
        'onclick': function() {
            dismissRemote(push);
        }
    });

    var now = Math.floor(Date.now() / 1000);
    var frequency = 12 * 60 * 60;
    var lastReported = parseInt(localStorage[push.package_name + 'Reported']);
    if (!lastReported || lastReported < now + frequency) {
        pb.track({
            'name': 'app_mirrored',
            'package_name': push.package_name
        });
    }

    getAndroidClickMapping();

    pb.ifNoNativeClientRunning(function() {
        pb.notifier.show(options);
    });
};

var dismissMirror = function(push) {
    var dismissKey = getKey(push);
    Object.keys(pb.notifier.active).map(function(key) {
        if (key.indexOf(dismissKey) != -1) {
            pb.notifier.dismiss(key);
        }
    });
};

var dismissRemote = function(push, triggerKey) {
    var dismiss = {
        'type': 'dismissal',
        'package_name': push.package_name,
        'notification_id': push.notification_id,
        'notification_tag': push.notification_tag,
        'source_user_iden': push.source_user_iden
    };

    if (push.conversation_iden) {
        dismiss.conversation_iden = push.conversation_iden;
    }

    if (triggerKey) {
        dismiss.trigger_action = triggerKey;
    }

    pb.post(pb.api + '/v2/ephemerals', {
        'type': 'push',
        'push': dismiss
    }, function(response) {
        if (response) {
            pb.log('Triggered remote dismissal of ' + getKey(push));
        } else {
            pb.log('Failed to trigger remote dismissal of ' + getKey(push));
        }
    });
};

var getKey = function(push) {
    var key = push.package_name + '_' + push.notification_tag + '_' + push.notification_id;
    if (push.conversation_iden) {
        key += '_' + push.conversation_iden;
    }
    return key;
};

var muteButton = function(push) {
    var mute = function() {
        pb.post(pb.api + '/v2/ephemerals', {
            'type': 'push',
            'push': {
                'type': 'mute',
                'package_name': push.package_name,
                'source_user_iden': push.source_user_iden
            }
        }, function(response) {
            if (response) {
                pb.log('Muted ' + push.package_name);
                showUndo();
            } else {
                pb.log('Failed to mute ' + push.package_name);
            }
        });
    };

    var showUndo = function() {
        var undo = {
            'type': 'basic',
            'key': getKey(push),
            'title': String.format(text.get('muted_app'), push.application_name),
            'message': '',
            'iconUrl': 'data:image/png;base64,' + push.icon,
            'priority': 0
        };

        undo.buttons = [{
            'title': String.format(text.get('unmute_app'), push.application_name),
            'iconUrl': 'ic_action_undo.png',
            'onclick': function() {
                pb.post(pb.api + '/v2/ephemerals', {
                    'type': 'push',
                    'push': {
                        'type': 'unmute',
                        'package_name': push.package_name,
                        'source_user_iden': push.source_user_iden
                    }
                }, function(response) {
                    if (response) {
                        pb.log('Unmuted ' + push.package_name);
                    } else {
                        pb.log('Failed to unmute ' + push.package_name);
                    }
                });
            }
        }];

        undo.buttons.push({
            'title': text.get('done'),
            'iconUrl': 'ic_action_tick.png',
            'onclick': function() {
            }
        });

        pb.notifier.show(undo);
    };

    return {
        'title': String.format(text.get('mute_app'), push.application_name),
        'short_title': text.get('mute'),
        'iconUrl': 'ic_action_halt.png',
        'onclick': function() {
            mute();
        }
    };
};

var maybeOpenTab = function(push) {
    var url = getWebUrl(push);
    if (!url) {
        // We don't know what to do for this type of notification yet
        return;
    }

    if (window.chrome && url.slice(-1) == '/') {
        var info = {
            'url': url + '*'
        };
        
        chrome.tabs.query(info, function(results) {
            if (results.length > 0) {
                var tab = results[0];
                chrome.windows.update(tab.windowId, { 'focused': true }, function() {
                    chrome.tabs.update(tab.id, { 'active': true }, function() {
                    });
                });
            } else {
                pb.openTab(url);
            }
        });
    } else {
        pb.openTab(url);
    }
};

var androidClickMapping;
var getAndroidClickMapping = function() {
    if (androidClickMapping) {
        return;
    }

    pb.log('Getting Android mapping');

    androidClickMapping = { };

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://update.pushbullet.com/android_mapping.json', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                androidClickMapping = JSON.parse(xhr.responseText);
            } catch (e) {
                androidClickMapping = null;
            }
        }
    };
    xhr.send();
}

var getWebUrl = function(push) {
    if (push.package_name == 'com.google.android.gm') {
        var parts = push.body.split('\n');
        var email = parts[0];
        return 'https://mail.google.com/mail/u/?authuser=' + email;
    } else if (androidClickMapping) {
        return androidClickMapping[push.package_name];
    }
};

var openQuickReply = function(push) {
    push.iden = Date.now(); // Unique iden to look it up with later (Chrome only)

    pb.log('Opening quick-reply for ' + getKey(push));

    var spec = {
        'url': 'quick-reply.html?push_iden=' + push.iden,
        'width': 320,
        'height': 420
    };

    var lastScreenX = localStorage['quickReplyScreenX'];
    var lastScreenY = localStorage['quickReplyScreenY'];
    if (lastScreenX && lastScreenY) {
        spec.top = parseInt(lastScreenY);
        spec.left = parseInt(lastScreenX);
    } else {
        spec.top = Math.floor((window.screen.availHeight / 2) - (spec.height / 2)) - 100,
        spec.left = Math.floor((window.screen.availWidth / 2) - (spec.width / 2)) + 100
    }

    if (window.chrome) {
        spec.type = 'popup';
        spec.focused = true;

        var listener = function(message, sender, sendResponse) {
            chrome.runtime.onMessage.removeListener(listener);

            if (message.pushIden == push.iden) {
                sendResponse(push);
            }
        };

        chrome.runtime.onMessage.addListener(listener);

        chrome.windows.create(spec, function(window) {
            chrome.windows.update(window.id, { 'focused': true }, function() {
            });
        });
    } else if (window.safari) {
        var listener = function(e) {
            if (e.name == 'request_conversation_push') {
                e.target.page.dispatchMessage('conversation_push', push);
                safari.application.removeEventListener('message', listener, false);
            }
        };

        safari.application.addEventListener('message', listener, false);

        var w = safari.application.openBrowserWindow();
        w.activeTab.url = safari.extension.baseURI + spec.url + '&width=' + spec.width + '&height=' + spec.height;
    } else {
        spec.push = push;

        self.port.emit('open_quickreply', spec);
    }
};


pb.sendReply = function(push, message) {
    pb.post(pb.api + '/v2/ephemerals', {
        'type': 'push',
        'push': {
            'type': 'messaging_extension_reply',
            'package_name': push.package_name,
            'source_user_iden': push.source_user_iden,
            'target_device_iden': push.source_device_iden,
            'conversation_iden': push.conversation_iden,
            'message': message
        }
    }, function(response) {
        if (response) {
            pb.log('Forwarding reply to ' + push.package_name);
        } else {
            pb.log('Failed to forward reply to ' + push.package_name);
        }
    });
};
