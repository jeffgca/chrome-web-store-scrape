'use strict';

var textMappings = {
    'pushbullet-desc': 'pushbullet_desc',
    'sign-up': 'panel_sign_up',
    'sign-in': 'sign_in',
    'sign-out': 'sign_out',
    'options': 'options',
    'push-tab': 'push_label',
    'notifications-tab': 'notifications',
    'sms-tab': 'sms',
    'push-send': 'push_button_label',
    'sms-send': 'send',
    'sms-disclaimer': 'sms_disclaimer',
    'note-label': 'type_note',
    'link-label': 'type_link',
    'file-label': 'type_file',
    'cant-sign-in': 'panel_cant_sign_in',
    'third-party-cookies': 'panel_third_party_cookies',
    'sms-warning': 'sms_warning'
};

var state = { };

window.init = function() {
    if (window.chrome) {
        document.body.classList.add('chrome');
    } else {
        document.body.classList.add('not-chrome');
    }

    if (window.safari) {
        document.body.classList.add('safari');
    } else {
        document.body.classList.add('not-safari');
    }

    if (!window.chrome && !window.safari) {
        document.body.classList.add('firefox');
    } else {
        document.body.classList.add('not-firefox');
    }

    var isPopout = (document.location.hash.indexOf('popout') !== -1);
    if (isPopout) {
        document.body.classList.add('popout');
    } else {
        document.body.classList.add('not-popout');
    }

    Object.keys(textMappings).map(function(key) {
        document.getElementById(key).textContent = text.get(textMappings[key]); 
    });

    document.getElementById('logo-link').onclick = function() {
        pb.openTab(pb.www);
        if (window.safari) {
            safari.self.hide();
        }
    };

    if (pb.local.user) {
        document.body.classList.add('signed-in');
    } else {
        document.body.classList.add('not-signed-in');
    }

    document.getElementById('third-party-cookies').onclick = function() {
        pb.openTab('https://support.mozilla.org/en-US/kb/disable-third-party-cookies');
    };

    document.getElementById('sign-in').onclick = function() {
        pb.openTab(pb.www + '/signin');
        if (window.safari) {
            safari.self.hide();
        } else if (isPopout && window.chrome) {
            window.close();
        }
    };

    document.getElementById('sign-up').onclick = function() {
        pb.openTab(pb.www + '/signin');
        if (window.safari) {
            safari.self.hide();
        } else if (isPopout && window.chrome) {
            window.close();
        }
    };

    setUpSettingsMenu();

    setUpTabs();

    setUpPushForm(isPopout);

    setUpSmsForm();

    setUpNotifications();

    if (isPopout) {
        setUpFileStuff();
        
        setTimeout(function() {
            var height = Math.max(document.body.scrollHeight, document.body.offsetHeight);
            var heightNeeded = height - window.innerHeight;
            if (heightNeeded != 0) {
                window.resizeBy(0, heightNeeded);
            }
        }, 300);
    }

    var xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://localhost:20807/check', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var snooze = document.getElementById('snooze');
                    snooze.style.display = 'none';
                    var notificationsHolder = document.getElementById('notifications-holder');
                    var notificationsHolderText = document.getElementById('notifications-holder-text');

                    var response = JSON.parse(xhr.responseText);
                    if (response.showing_mirrors && response.running) {
                        notificationsHolder.classList.add('desktop-app');

                        if (navigator.platform.indexOf('Mac') != -1) {
                            notificationsHolder.classList.add('mac');
                        } else {
                            notificationsHolder.classList.add('windows');
                        }

                        notificationsHolderText.textContent = text.get('alert_desktop_app_notifications');
                    }
                }
            }
        };
    try {
        xhr.send();
    } catch (e) {
        pb.log(e);
    }
};

var setUpSettingsMenu = function() {
    var settingsGear = document.getElementById('settings-gear');
    var settingsMenu = document.getElementById('settings-menu');
    var menuSink = document.getElementById('menu-sink');

    settingsGear.onclick = function() {
        settingsMenu.style.display = 'block';
        menuSink.style.display = 'block';
    };

    menuSink.onclick = function() {
        settingsMenu.style.display = 'none';
        menuSink.style.display = 'none';
    };

    var snooze = document.getElementById('snooze');

    var setUpSnooze = function() {
        if (localStorage.snoozedUntil > Date.now()) {
            snooze.textContent = text.get('unsnooze');
            snooze.onclick = function() {
                pb.unsnooze();

                setTimeout(function() {
                    setUpSnooze();
                }, 200);
            };
        } else {
            snooze.textContent = text.get('snooze');
            snooze.onclick = function() {
                pb.snooze();

                setTimeout(function() {
                    setUpSnooze();
                }, 200);
            };
        }
    };

    setUpSnooze();

    var options = document.getElementById('options');

    if (window.chrome) {
        var optionsUrl = chrome.extension.getURL('options.html');

        options.onclick = function() {
            chrome.tabs.query({ url: optionsUrl }, function(tabs) {
                if (tabs.length) {
                    chrome.tabs.update(tabs[0].id, { active: true });
                    setTimeout(window.close, 120);
                } else {
                    pb.openTab(optionsUrl);
                }
            });
        };
    } else {
        options.onclick = function() {
            if (window.safari) {
                // Dead code - no options in safari just yet
                // pb.openTab(safari.extension.baseURI + 'options.html');
                // safari.self.hide();
            } else {
                pb.openTab('about:addons');
            }
        }
    };

    document.getElementById('sign-out').onclick = function() {
        pb.signOut();
        if (window.chrome) {
            window.close();
        } else if (window.safari) {
            safari.self.hide();
        }
    };
};

var setUpTabs = function() {
    var pushTab = document.getElementById('push-tab');
    var smsTab = document.getElementById('sms-tab');
    var notificationsTab = document.getElementById('notifications-tab');

    var tabs = [pushTab, smsTab, notificationsTab];

    var onclick = function(e) {
        tabs.map(function(tab) {
            tab.classList.remove('selected');
            document.getElementById(tab.id + '-content').style.display = 'none';
        });

        e.target.classList.add('selected');
        document.getElementById(e.target.id + '-content').style.display = 'block';

        localStorage.activePanelTab = e.target.id.split('-')[0];
    };

    tabs.map(function(tab) {
        tab.onclick = onclick;
    });

    if (localStorage.activePanelTab == 'notifications') {
        notificationsTab.click();
    } else if (localStorage.activePanelTab == 'sms') {
        smsTab.click();
    } else {
        pushTab.click();
    }
};

var setUpPushForm = function(isPopout) {
    var pushTarget = document.getElementById('push-target');
    var title = document.getElementById('title');
    var url = document.getElementById('url');
    var body = document.getElementById('body');

    var fileHolder = document.getElementById('file-holder');

    var popOut = document.getElementById('pop-out');
    if (pb.popOutPanel) {        
        popOut.textContent = text.get('panel_push_file_open_popout');
        
        if(window.chrome) {        
            chrome.commands.getAll(function(commands) {
                var command;
                for (var commandKey in commands) {
                    command = commands[commandKey];

                    if (command.name === 'pop-out-panel' && command.shortcut) {
                        document.getElementById('popout-panel').title = popOut.title = command.shortcut;
                        return;
                    }
                }
            });
        }
    } else {
        popOut.textContent = text.get('panel_push_file');
    }    
    popOut.onclick = function() {
        if (pb.popOutPanel) {
            pb.popOutPanel();

            if (window.chrome) {
                setTimeout(window.close, 120);
            } else if (window.safari) {
                safari.self.hide();
            }
        } else {
            pb.openTab(pb.www + '/push/file');
        }
    };

    pushTarget.placeholder = text.get('push_target_placeholder');
    title.placeholder = text.get('title_placeholder');
    url.placeholder = text.get('url_placeholder');
    body.placeholder = text.get('message_placeholder');

    var typeNote = document.getElementById('type-note');
    var typeLink = document.getElementById('type-link');
    var typeFile = document.getElementById('type-file');

    var savedNote = localStorage.savedNote;
    if (savedNote) {
        savedNote = JSON.parse(savedNote);

        state.noteTitle = savedNote.title || '';
        state.noteBody = savedNote.body || '';
    }

    var types = [typeNote, typeLink, typeFile];

    var onTypeClick = function(e) {
        if (types.indexOf(e.target) == -1) {
            type = e.target.parentElement;
        } else {
            type = e.target;
        }

        types.map(function(type) {
            type.classList.remove('selected');
        });

        type.classList.add('selected');

        title.style.display = 'none';
        url.style.display = 'none';
        body.style.display = 'none';
        fileHolder.style.display = 'none';

        if (type == typeNote) {
            title.style.display = 'block';
            body.style.display = 'block';

            body.style.height = '139px';

            title.value = state.noteTitle || '';
            body.value = state.noteBody || '';
        } else if (type == typeLink) {
            title.style.display = 'block';
            url.style.display = 'block';
            body.style.display = 'block';

            body.style.height = '90px';

            title.value = state.linkTitle || '';
        } else {
            fileHolder.style.display = 'block';
        }

        state.activeType = type;
    };

    types.map(function(type) {
        type.onclick = onTypeClick;
    });

    if (isPopout) {
        typeFile.click();
    } else {
        typeLink.click();
    }

    var targets = { 'devices': [], 'contacts': [], 'channels': [] };

    for (var type in targets) {
        for (var key in pb.local[type]) {
            targets[type].push(pb.local[type][key]);
        }
    }

    picker.setUp({
        'inputId': 'push-target',
        'pickerId': 'push-picker',
        'overlayId': 'push-picker-overlay',
        'targets': targets,
        'showAddFriends': true,
        'showAllDevices': true
    });

    pb.getActiveTab(function(tab) {
        state.linkTitle = tab.title;

        title.value = state.linkTitle || '';
        url.value = tab.url || '';
    });
    
    url.onkeydown = title.onkeydown =
        body.onkeydown = function(e) {
            if (e.keyCode == 13 && e.ctrlKey) {
                pushSend.click();
                return false;
            }
        };

    var pushSend = document.getElementById('push-send');
    pushSend.onclick = function() {
        if (pushSend.disabled) {
            return;
        }

        pushSend.disabled = true;
        pushSend.classList.add('disabled');

        var push = { };

        var target = pushTarget.target;
        if (target) {
            if (target == '*') {
            } else if (target.email) {
                push.email = target.email;
            } else if (target.tag) {
                push.channel_tag = target.tag;
            } else {
                push.device_iden = target.iden;
            }
        } else {
            push.email = pushTarget.value;
        }

        push.type = state.activeType.id.split('-')[1];

        try {
            if (push.type == 'link') {
                if (!url.value) {
                    return;
                }
                
                push.url = url.value;
            } else if (push.type == 'file') {
                if (!state.file) {
                    return;
                }

                push.file = state.file;
            }

            push.title = title.value;
            push.body = body.value;

            pb.sendPush(push);

            state.pushed = true;

            setTimeout(function() {
                if (window.chrome) {
                    window.close();
                } else if (window.safari) {
                    safari.self.hide();
                }
            }, 120);
        } finally {
            if(!state.pushed) {
                pushSend.classList.remove('disabled');
                pushSend.disabled = false;
            }
        }
    };
};

var setUpFileStuff = function() {
    var fileInput = document.getElementById('file-input');
    var fileHolder = document.getElementById('file-holder');
    var fileLabel = document.getElementById('file-input-label');
    var pushSend = document.getElementById('push-send');
    var imagePreview = document.getElementById('img-preview');

    fileLabel.textContent = text.get('panel_push_file_popout');

    fileHolder.onclick = function() {
        fileInput.click();
    };

    fileInput.onchange = function() {
        handleFile(this.files[0]);
    };

    var handleFile = function(file) {
        if (!file) {
            if (!state.file) {
                fileLabel.textContent = text.get('panel_push_file_popout');
                
                if (imagePreview) { 
                    imagePreview.style.display = 'none';
                }
            }
            return;
        }
    
        var size = file.size / (1024 * 1024);
        if (size > 25) {
            delete state['file'];
            fileLabel.textContent = text.get('panel_push_file_too_big');
        } else {
            state.file = file;
            fileLabel.textContent = file.name;

            if (!file.type.match(/image.*/)) {
                if (imagePreview) { 
                    imagePreview.style.display = 'none';
                }
                return;
            }
            
            if (!imagePreview) {
                imagePreview = document.createElement("img");
                imagePreview.id = 'img-preview';
                imagePreview.classList.add("obj");
                fileHolder.appendChild(imagePreview);
            }
            
            imagePreview.file = file;
            
            var reader = new FileReader();
            reader.onload = (function(aImg) { 
                return function(e) { aImg.src = e.target.result; };
            })(imagePreview);
            reader.readAsDataURL(file);
            
            imagePreview.style.display = 'block';
        }
    };

    fileHolder.ondragenter = function(e) {
        fileLabel.textContent = text.get('panel_push_file_release');
    };

    fileHolder.ondragleave = function(e) {
        fileLabel.textContent = state.file ? state.file.name : text.get('panel_push_file_popout');
    };

    fileHolder.ondragover = function(e) {
        e.preventDefault();
    };

    fileHolder.ondrop = function(e) {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files) {
            handleFile(e.dataTransfer.files[0]);
        }
    };
};

var setUpSmsForm = function() {
    var device = document.getElementById('sms-device');
    var recipient = document.getElementById('sms-recipient');
    var message = document.getElementById('sms-message');

    device.placeholder = text.get('sms_device_placeholder');
    recipient.placeholder = text.get('recipient_placeholder');
    message.placeholder = text.get('message_placeholder');

    var targets = { 'devices': [] };
    for (var type in targets) {
        for (var key in pb.local[type]) {
            var target = pb.local[type][key];
            if (target.has_sms) {
                targets[type].push(target);
            }
        }
    }

    if (targets.devices.length == 0) {
        // No devices can send SMS, don't load the tab
        return;
    }

    document.getElementById('sms-warning-link').onclick = function() {
        pb.openTab('https://help.pushbullet.com/articles/why-are-some-text-messages-not-sending/');
    };

    var smsLengthHolder = document.getElementById('sms-length');
    var smsWarning = document.getElementById('sms-warning');
    var smsChange = function() {
        var count = pb.getSmsLength(message.value);

        smsLengthHolder.textContent = count + "/160";

        if (count > 160) {
            smsWarning.style.display = 'inline';
        } else {
            smsWarning.style.display = 'none';
        }
    };

    message.addEventListener('input', function() {
        smsChange();
    }, false);

    document.getElementById('sms-tab').style.display = 'block';

    if (localStorage.savedSms) {
        message.value = localStorage.savedSms;
        smsChange();
    }

    var onSmsDeviceSelected = function(device) {
        pb.getPhonebook(device, function(response) {
            var targets = { };
            if (response) {
                targets.phonebook = response.phonebook;
            }

            picker.setUp({
                'inputId': 'sms-recipient',
                'pickerId': 'sms-recipient-picker',
                'overlayId': 'sms-recipient-picker-overlay',
                'targets': targets,
                'onselect': function() {
                    setTimeout(function() {
                        message.focus();
                    }, 10);
                }
            });
        });
    };

    picker.setUp({
        'inputId': 'sms-device',
        'pickerId': 'sms-device-picker',
        'overlayId': 'sms-device-picker-overlay',
        'targets': targets,
        'onselect': onSmsDeviceSelected
    });

    message.onkeydown = function(e) {
        if (e.keyCode == 13 && e.ctrlKey) {
            smsSend.click();
            return false;
        }
    };

    var smsSend = document.getElementById('sms-send');
    smsSend.onclick = function() {
        if (smsSend.disabled) {
            return;
        }

        var smsDevice = document.getElementById('sms-device').target;
        if (!smsDevice || !smsDevice.has_sms) {
            return;
        }

        var smsRecipient = recipient.target || recipient.value;
        if (!smsRecipient) {
            return;
        }

        var smsBody = message.value;
        if (!smsBody) {
            return;
        }

        var push = {
            'type': 'messaging_extension_reply',
            'package_name': 'com.pushbullet.android',
            'source_user_iden': pb.local.user.iden,
            'source_device_iden': smsDevice.iden,
            'conversation_iden': smsRecipient.phone || smsRecipient
        };

        state.smsSent = true;

        sendSms(push, smsBody);

        smsSend.disabled = true;
        smsSend.classList.add('disabled');

        setTimeout(function() {
            if (window.chrome) {
                window.close();
            } else if (window.safari) {
                safari.self.hide();
            }
        }, 120);
    };
}

var sendSms = function(push, message) {
    if (window.chrome) {
        var bg = chrome.extension.getBackgroundPage();
        bg.pb.sendReply(push, message);
    } else if (window.safari) {
        safari.extension.globalPage.contentWindow.pb.sendReply(push, message);
    } else if (self.port) {
        self.port.emit('send_reply', { 'push': push, 'message': message });
    }

    pb.track({
        'name': 'new_sms_sent',
        'package_name': push.package_name
    });
};

var setUpNotifications = function() {
    if (self.port) {
        self.port.emit('get_notifications');
        self.port.once('notifications', function(data) {
            renderNotifications(data);
        });
    }

    var bg;
    if (window.chrome) {
        bg = chrome.extension.getBackgroundPage();
    } else if (window.safari) {
        bg = safari.extension.globalPage.contentWindow;
    } else {
        return;
    }

    bg.addEventListener('notifications_changed', notificationsListener, false);

    renderNotifications(bg.pb.notifier.active);
};

var notificationsListener = function() {
    if (!window) {
        return;
    }

    var bg;
    if (window.chrome) {
        bg = chrome.extension.getBackgroundPage();
    } else if (window.safari) {
        bg = safari.extension.globalPage.contentWindow;
    } else {
        return;
    }

    renderNotifications(bg.pb.notifier.active);
};

var renderNotifications = function(notifications) {
    var notificationsHolder = document.getElementById('notifications-holder');
    var notificationsHolderText = document.getElementById('notifications-holder-text');

    while (notificationsHolder.firstChild) {
        notificationsHolder.removeChild(notificationsHolder.firstChild);
    }

    var makeButton = function(notification, button) {
        var label = document.createElement('span');
        label.className = 'notification-small notification-button-label';
        label.textContent = button.title;

        var div = document.createElement('div');
        div.className = 'notification-button notification-bottom-border';

        if (button.iconUrl) {
            var img = document.createElement('img');
            img.className = 'notification-button-icon';
            img.src = button.iconUrl;
            div.appendChild(img);
        }

        div.appendChild(label);

        div.onclick = function() {
            if (window.chrome) {
                button.onclick();
                chrome.extension.getBackgroundPage().chrome.notifications.clear(notification.key, function(wasCleared) {
                    if (!wasCleared) {
                        delete notifications[notification.key];
                        if (notification.onclose) {
                            notification.onclose();
                        }
                    }
                });
            } else if (window.safari) {
                button.onclick();
                safari.extension.globalPage.contentWindow.pb.notifier.active[notification.key].notification.close();
            } else {
                self.port.emit('notification_button_clicked', { 'key': notification.key, 'title': button.title });
                clearNotification(notification);
            }
        };

        return div;
    };

    var clearNotification = function(notification) {
        if (window.chrome) {
            chrome.extension.getBackgroundPage().chrome.notifications.clear(notification.key, function(wasCleared) {
                if (!wasCleared) {
                    delete notifications[notification.key];
                    if (notification.onclose) {
                        notification.onclose();
                    }
                }
            });
        } else if (window.safari) {
            safari.extension.globalPage.contentWindow.pb.notifier.active[notification.key].notification.close();
        } else {
            delete notifications[notification.key];
            renderNotifications(notifications);
        }
    };

    var renderNotification = function(notification) {
        var close = document.createElement('img');
        close.src = 'ic_action_cancel.png';
        close.className = 'notification-close';
        close.onclick = function() {
            if (self.port) {
                self.port.emit('notification_closed', notification.key);
            }

            clearNotification(notification);
        };

        var image = document.createElement('img');
        image.className = 'notification-image';
        image.src = notification.iconUrl;

        var imageHolder = document.createElement('div');
        imageHolder.className = 'notification-image-holder';
        imageHolder.appendChild(image);

        var textHolder = document.createElement('div');
        textHolder.className = 'notification-text-holder pointer';

        var title = document.createElement('div');
        title.className = 'notification-title';

        var message = document.createElement('div');
        message.className = 'notification-small notification-message';

        var contextMessage = document.createElement('div');
        contextMessage.className = 'notification-small notification-context-message';

        title.textContent = notification.title || '';
        message.textContent = notification.message || '';
        contextMessage.textContent = notification.contextMessage || '';

        textHolder.appendChild(title);
        textHolder.appendChild(message);
        textHolder.appendChild(contextMessage);

        textHolder.onclick = function() {
            if (self.port) {
                self.port.emit('notification_clicked', notification.key);
            } else {
                notification.onclick();
            }

            clearNotification(notification);
        };

        var border = document.createElement('div');
        border.className = 'notification-bottom-border';

        var buttons = document.createElement('div');

        if (notification.allButtons) {
            notification.allButtons.map(function(button) {
                buttons.appendChild(makeButton(notification, button));
            });
        }

        var div = document.createElement('div');
        div.className = 'notification';
        div.appendChild(close);
        div.appendChild(imageHolder);
        div.appendChild(textHolder);
        div.appendChild(border);
        div.appendChild(buttons);
        return div;
    };

    Object.keys(notifications).map(function(key) {
        var notification = notifications[key];
        notificationsHolder.insertBefore(renderNotification(notification), notificationsHolder.firstChild);
    });

    if (Object.keys(notifications).length == 0) {
        notificationsHolder.classList.add('empty');
        notificationsHolderText.style.display = 'block';
        notificationsHolderText.textContent = text.get('no_notifications');
    } else  {
        notificationsHolder.classList.remove('empty');
        notificationsHolderText.style.display = 'none';
    }
};

window.onunload = function() {
    if (window.chrome || window.safari) {
        var bg = window.chrome ? chrome.extension.getBackgroundPage() : safari.extension.globalPage.contentWindow;
        bg.removeEventListener('notifications_changed', notificationsListener, false);
    }

    if (state.pushed) {
        delete localStorage['savedNote'];
    } else if (state.activeType.id == 'type-note') {
        localStorage.setItem('savedNote',
            JSON.stringify({
                'title': document.getElementById('title').value,
                'body': document.getElementById('body').value
            })
        );
    } else if (state.smsSent) {
        delete localStorage['savedSms'];
    } else {
        var message = document.getElementById('sms-message');
        localStorage['savedSms'] = message.value;
    }
};
