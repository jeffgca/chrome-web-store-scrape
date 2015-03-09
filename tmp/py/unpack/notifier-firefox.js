'use strict';

pb.notifier.notify = function(options, dontNotify) {
    if (dontNotify) {
        return;
    }

    if (pb.options.snoozedUntil > Date.now()) {
        pb.log('Not showing notification ' + options.key + ', snoozed');
        return;
    }

    var spec = {
        'key': options.key,
        'title': options.title,
        'message': options.message,
        'contextMessage': options.contextMessage,
        'iconUrl': options.iconUrl
    };

    if (spec.message.length > 500) {
        spec.message = spec.message.substring(0, 500);
    }

    pb.notifier.active[options.key] = options;

    self.port.emit('show_notification', spec);

    self.port.emit('notifications_changed', pb.notifier.active);
};

pb.notifier.dismiss = function(key) {
    var options = pb.notifier.active[key];
    if (options && options.onclose) {
        options.onclose();
    }

    delete pb.notifier.active[key];

    self.port.emit('notifications_changed', pb.notifier.active);
};

self.port.on('notification_clicked', function(key) {
    var options = pb.notifier.active[key];
    if (options.onclick) {
        options.onclick();
    }
});

self.port.on('notification_button_clicked', function(spec) {
    var options = pb.notifier.active[spec.key];
    options.allButtons.map(function(button) {
        if (button.title == spec.title) {
            button.onclick();
        }
    });
});

self.port.on('notification_closed', function(key) {
    pb.notifier.dismiss(key);
});
