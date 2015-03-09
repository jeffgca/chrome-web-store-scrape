'use strict';

var textMappings = {
    'mute-app-question': 'how_to_mute_app',
    'mute-app-answer': 'how_to_mute_app_answer'
};

var categories = {
    'general': {
        'label': text.get('general'),
        'options': [{
            'key': 'backgroundPermission',
            'label': text.get('option_background_permission'),
            'desc': text.get('option_background_permission_desc')
        }, {
            'key': 'useDarkIcon',
            'label': text.get('option_use_dark_icon'),
            'desc': text.get('option_use_dark_icon_desc')
        }, {
            'key': 'showNotificationCount',
            'label': text.get('option_show_notification_count'),
            'desc': text.get('option_show_notification_count_desc')
        }, {
            'key': 'openMyLinksAutomatically',
            'label': text.get('option_open_my_pushes_automatically'),
            'desc': text.get('option_open_my_pushes_automatically_desc')
        }, {
            'key': 'clipboardPermission',
            'label': text.get('option_clipboard_permission'),
            'desc': text.get('option_clipboard_permission_desc')
        }]
    }, 
    'notifications': {
        'label': text.get('notifications'),
        'options': [{
            'key': 'showMirrors',
            'label': text.get('option_show_mirrors'),
            'desc': text.get('option_show_mirrors_desc')
        }, {
            'key': 'onlyShowTitles',
            'label': text.get('option_only_show_titles'),
            'desc': text.get('option_only_show_titles_desc')
        }, {
            'key': 'playSound',
            'label': text.get('option_play_sound'),
            'desc': text.get('option_play_sound_desc')
        }]
    },
    'advanced': {
        'label': text.get('advanced'),
        'options': [{
            'key': 'showContextMenu',
            'label': text.get('option_show_context_menu'),
            'desc': text.get('option_show_context_menu_desc')
        }, {
            'key': 'preferLinksOverImages',
            'label': text.get('option_prefer_links_over_images'),
            'desc': text.get('option_prefer_links_over_images_desc')
        }, {
            'key': 'allowInstantPush',
            'label': text.get('option_allow_instant_push'),
            'desc': text.get('option_allow_instant_push_desc')
        }]
    }
};

window.init = function() {
    if (window.chrome) {
        chrome.windows.getCurrent({}, function(current) {
            if (current.type == 'popup') {
                pb.log('Options launched directly from shortcut - displaying popout UI');
                document.location = '/panel.html#popout';
            }
        });
    }
    
    pb.track({
        'name': 'goto',
        'url': '/options'
    });

    Object.keys(textMappings).map(function(key) {
        document.getElementById(key).textContent = text.get(textMappings[key]); 
    });

    document.getElementById('logo-link').href = pb.www;
    document.getElementById('version').textContent = 'v' + pb.version;

    if (pb.local && pb.local.user) {
        document.getElementById('account').textContent = pb.local.user.email;
    }

    setUpOptions();

    if (window.location.hash) {
        var hashTab = document.getElementById('tab-' + window.location.hash.substring(1).toLowerCase());
        if (hashTab) {
            hashTab.onclick();
        }
    } else {
        document.getElementById('tab-' + Object.keys(categories)[0]).onclick();
    }
};

var setUpOptions = function() {
    var tabs = document.getElementById('tabs');
    var options = document.getElementById('options');

    var resetTabs = function() {
        Object.keys(categories).map(function(key) {
            var tab = document.getElementById('tab-' + key);
            tab.className = 'tab';
            var tabOptions = document.getElementById('tab-' + key + '-options');
            tabOptions.style.display = 'none';
        });
    };

    var renderOption = function(option) {
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = option.key + '-checkbox';
        checkbox.checked = localStorage[option.key] == 'true';
        checkbox.onclick = function() {
            localStorage[option.key] = checkbox.checked;
            optionsChanged();
        };

        var labelText = document.createElement('span');
        labelText.className = 'option-title';
        labelText.textContent = option.label;

        var label = document.createElement('label');
        label.id = option.key + '-label';
        label.className = 'option-label';
        label.appendChild(checkbox);
        label.appendChild(labelText);

        var desc = document.createElement('div');
        desc.className = 'option-desc';
        desc.textContent = option.desc;

        var div = document.createElement('div');
        div.id = option.key;
        div.className = 'option';
        div.appendChild(label);
        div.appendChild(desc);
        return div;
    };


    var fillOptions = function(category, container) {
        category.options.map(function(option) {
            var div = renderOption(option);
            container.appendChild(div);
        });
    };

    Object.keys(categories).map(function(key) {
        var category = categories[key];

        var tabOptions = document.createElement('div');
        tabOptions.id = 'tab-' + key + '-options';
        fillOptions(category, tabOptions);
        options.appendChild(tabOptions);

        var tab = document.createElement('div');
        tab.id = 'tab-' + key;
        tab.href = '#' + key;
        tab.textContent = category.label;
        tab.className = 'tab';
        tab.onclick = function() {
            resetTabs();
            tab.className = 'tab selected';
            tabOptions.style.display = 'block';
            window.location.hash = key;
        };

        tabs.appendChild(tab);
    });

    var backgroundPermission = document.getElementById('backgroundPermission');
    var backgroundPermissionCheckbox = document.getElementById('backgroundPermission-checkbox');
    if (!window.chrome || navigator.platform.toLowerCase().indexOf('win') < 0) {
        backgroundPermission.style.display = 'none';
    }

    var clipboardPermission = document.getElementById('clipboardPermission');
    var clipboardPermissionCheckbox = document.getElementById('clipboardPermission-checkbox');
    if (!window.chrome) {
        clipboardPermission.style.display = 'none';
    }

    if (window.chrome) {
        (function() {
            var hasPermission, permission = { 'permissions': ['background'] };

            var onPermissionUpdate = function(granted) {
                hasPermission = !!granted;
                backgroundPermissionCheckbox.checked = hasPermission;
            };

            chrome.permissions.contains(permission, onPermissionUpdate);

            backgroundPermissionCheckbox.addEventListener('click', function(event) {
                if (hasPermission) {
                    chrome.permissions.remove(permission,
                        function(removed) {
                            onPermissionUpdate(!removed);
                        }
                    );
                } else {
                    chrome.permissions.request(permission, onPermissionUpdate);
                }
            });
        })();

        (function() {
            var hasPermission, permission = { 'permissions': ['clipboardRead', 'clipboardWrite'] };

            var onPermissionUpdate = function(granted) {
                hasPermission = !!granted;
                clipboardPermissionCheckbox.checked = hasPermission;
            };

            chrome.permissions.contains(permission, onPermissionUpdate);

            clipboardPermissionCheckbox.addEventListener('click', function(event) {
                if (hasPermission) {
                    chrome.permissions.remove(permission,
                        function(removed) {
                            onPermissionUpdate(!removed);
                        }
                    );
                } else {
                    chrome.permissions.request(permission, onPermissionUpdate);
                }
            });
        })();
    }

    var notificationsOptions = document.getElementById('tab-notifications-options');

    var duration = document.createElement('div');
    duration.className = 'option option-desc';

    if (navigator.userAgent.indexOf('OPR') >= 0) { // No duration option for Opera
        duration.style.display = 'none';
    }

    var label = document.createElement('span');
    label.className = 'option-label';
    label.style.display = 'inline';
    label.textContent = text.get('option_notification_duration');

    var durationSelect = document.createElement('select');
    durationSelect.style.marginLeft = '6px';

    var option1 = document.createElement('option');
    option1.value = '8';
    option1.textContent = '8 seconds';

    var option2 = document.createElement('option');
    option2.value = '0';
    option2.selected = 'true';
    option2.textContent = '30 seconds';

    durationSelect.add(option1);
    durationSelect.add(option2);

    if (!localStorage.notificationDuration || localStorage.notificationDuration == '0') {
        durationSelect.selectedIndex = 1;
    } else {
        durationSelect.selectedIndex = 0;
    }

    durationSelect.onchange = function() {
        localStorage.notificationDuration = durationSelect.options[durationSelect.selectedIndex].value;
        optionsChanged();
    };

    duration.appendChild(label);
    duration.appendChild(durationSelect);

    notificationsOptions.insertBefore(duration, notificationsOptions.firstChild);

    var deviceSelect = document.createElement('select');
    deviceSelect.style.marginLeft = '6px';

    var instantPushLabel = document.getElementById('allowInstantPush-label');
    instantPushLabel.appendChild(deviceSelect);

    var instantPushCheckbox = document.getElementById('allowInstantPush-checkbox');

    if (window.chrome && pb.local.user) {
        var onclick = instantPushCheckbox.onclick;

        deviceSelect.disabled = !instantPushCheckbox.checked;

        var instantOptionsChanged = function() {
            deviceSelect.disabled = !instantPushCheckbox.checked;

            if (instantPushCheckbox.checked) {
                localStorage.instantPushIden = deviceSelect.value;
            } else {
                delete localStorage['instantPushIden'];
            }
            
            onclick();
        };

        instantPushCheckbox.onclick = instantOptionsChanged;

        if (pb.local.devices) {
            var deviceKeys = Object.keys(pb.local.devices),
                device, deviceOption;

            deviceKeys.map(function(key) {
                device = pb.local.devices[key];
                deviceOption = document.createElement('option');

                deviceOption.value = device.iden;
                deviceOption.textContent = device.nickname;

                deviceSelect.add(deviceOption);
            });
        }

        deviceSelect.onchange = instantOptionsChanged;

        if (localStorage.instantPushIden) {
            deviceSelect.value = localStorage.instantPushIden;
        } else if (deviceSelect.children.length) {
            deviceSelect.value = deviceSelect.firstChild.value;
        }

        var shortcutLink = document.createElement('a');

        chrome.commands.getAll(function(commands) {
            var command, linkText = ' ' + text.get('option_instant_push_shortcuts');
            for (var commandKey in commands) {
                command = commands[commandKey];

                if (command.name === 'instant-push-current-tab' && command.shortcut) {
                    shortcutLink.textContent = String.format(linkText, command.shortcut);
                    return;
                }
            }

            shortcutLink.textContent = String.format(linkText, text.get('option_instant_push_shortcuts_not_set'));
        });

        var alertText = text.get('option_instant_push_shortcuts_alert');

        shortcutLink.onclick = function() {
            var goToLink = confirm(alertText);

            if (goToLink) {
                pb.openTab('chrome://extensions');
            }
        };

        document.getElementById('allowInstantPush').lastChild.appendChild(shortcutLink);
    } else {
        instantPushCheckbox.checked = false;
        instantPushCheckbox.disabled = true;
    }

    var notificationsTab = document.getElementById('tab-notifications');
    var xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://localhost:20807/check', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var response = JSON.parse(xhr.responseText);
                    
                    if (response.showing_notifications && response.showing_mirrors && response.running) {
                        notificationsTab.style.display = 'none';
                    }

                    clipboardPermission.style.display = 'none';
                }
            }
        };
    try {
        xhr.send();
    } catch (except) {
        pb.log(except);
    }
};

var optionsChanged = function() {
    pb.loadOptions();
};
