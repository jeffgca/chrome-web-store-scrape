'use strict';

pb.ifNoNativeClientRunning = function(callback) {
    var needsCheck = false;
    if (pb.local.devices) {
        Object.keys(pb.local.devices).map(function(key) {
            var device = pb.local.devices[key];
            if (device.type == 'windows' || device.type == 'mac') {
                needsCheck = true;
            }
        });
    }

    if (needsCheck) {
        var onResponse = function(response) {
            if (response && response.running) {
                pb.log('Not showing notification, native client confirmed');
            } else {
                callback();
            }
        };

        if (self.port) {
            self.port.emit('check_client');
            self.port.once('checked_client', function(response) {
                onResponse(response);
            });
        } else {
            pb.get('http://localhost:20807/check', function(response) {
                onResponse(response);
            });
        }
    } else {
        callback();
    }
};
