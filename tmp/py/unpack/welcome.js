'use strict';

var textMappings = {
    'get-pushbullet': 'welcome_get_pushbullet',
    'get-pushbullet-link': 'welcome_get_pushbullet_link',
    'background-title': 'option_background_permission',
    'background-desc': 'option_background_permission_desc',
    'sound-title': 'option_play_sound',
    'sound-desc': 'option_play_sound_desc'
};

window.init = function() {
    pb.track({
        'name': 'goto',
        'url': '/welcome'
    });

    Object.keys(textMappings).map(function(key) {
        document.getElementById(key).textContent = text.get(textMappings[key]); 
    });

    document.getElementById('logo-link').href = pb.www;

    document.getElementById('heading').textContent = String.format(text.get('welcome_heading'), pb.local.device.model);

    var button = document.getElementById('button');
    button.textContent = text.get('welcome_done_button');
    button.onclick = function() {
        setTimeout(window.close, 160);
    };

    var setUpBackgroundCheckbox = function() {
        var backgroundPermission = document.getElementById('background-permission');
        var backgroundPermissionCheckbox = document.getElementById('background-checkbox');

        if (navigator.platform.toLowerCase().indexOf('win') < 0) {
            backgroundPermission.style.display = 'none';
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
        }
    };

    var setUpSoundCheckbox = function() {
        var playSound = document.getElementById('play-sound');
        if (!window.chrome) {
            playSound.style.display = 'none';
        }

        var soundCheckbox = document.getElementById('sound-checkbox');
        soundCheckbox.checked = localStorage.playSound == 'true';

        soundCheckbox.onclick = function() {
            localStorage.playSound = soundCheckbox.checked;
            pb.loadOptions();
        };

        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://localhost:20807/check', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    playSound.style.display = 'none';
                }
            }
        };
        xhr.send();
    };

    setUpBackgroundCheckbox();
    setUpSoundCheckbox();
}
