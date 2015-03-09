'use strict';

var textarea = document.createElement('textarea');
document.body.appendChild(textarea);

var timeout;

pb.addEventListener('signed_in', function(e) {
    pb.addEventListener('stream_message', function(e) {
        var message = e.detail;
        if (message.type == 'push') {
            var push = message.push;
            if (pb.local.device
                && ((push.target_device_iden
                    && push.target_device_iden
                    != pb.local.device.iden)
                || (push.source_device_iden
                    && push.source_device_iden == pb.local.device.iden))) {
                return;
            }

            if (push.type == 'clip') {
                if (self.port) {
                    self.port.emit('clip_push', push);
                } else {
                    checkPermissions(function() {
                        pb.ifNoNativeClientRunning(function() {
                            textarea.value = push.body;
                            textarea.select();
                            pb.clip = textarea.value;
                            document.execCommand('copy');
                        });
                    });
                }
            }
        }
    });

    if (self.port) {
        self.port.on('clip', function(clip) {
            publishChip(clip);
        });

        return;
    }

    updateClip(function() { });

    clearTimeout(timeout);
    
    var check = function() {
        timeout = setTimeout(function() {
            checkPermissions(function(granted) {
                if (granted) {
                    updateClip(function(clip) {
                        if (clip) {
                            pb.ifNoNativeClientRunning(function() {
                                publishChip(clip);
                            });
                        }

                        check();
                    });
                } else {
                    check();
                }
            });
        }, 250);
    };

    check();
});

pb.addEventListener('signed_out', function(e) {
    clearTimeout(timeout);
});

var updateClip = function(callback) {
    textarea.value = '';
    textarea.focus();
    document.execCommand('paste');

    if (textarea.value != '' && textarea.value != pb.clip) {
        pb.clip = textarea.value;
        callback(pb.clip);
    } else {
        callback();
    }
};

var publishChip = function(clip) {
    pb.post(pb.api + '/v2/ephemerals', {
        'type': 'push',
        'push': {
            'type': 'clip',
            'body': clip,
            'source_user_iden': pb.local.user.iden,
            'source_device_iden': pb.local.device.iden
        }
    }, function(response) {
        if (response) {
            pb.log('Published clip');
        } else {
            pb.log('Failed to publish clip');
        }
    });
}

var checkPermissions = function(callback) {
    chrome.permissions.contains({ 'permissions': ['clipboardRead', 'clipboardWrite'] }, function(granted) {
        callback(granted);
    });
}
