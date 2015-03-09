'use strict';

pb.notifier.notify = function(options, dontNotify) {
    if (pb.options.snoozedUntil > Date.now()) {
        pb.log('Not showing notification ' + options.key + ', snoozed');
        return;
    }

    if (!window.Notification) {
        pb.log('Notifications not available');
        return;
    }

    var notification = new Notification(options.title, {
        'body': options.message,
        'tag': options.key
    });

    options.notification = notification;

    pb.notifier.active[options.key] = options;
    pb.dispatchEvent('notifications_changed');

    notification.onclick = function() {
        if (options.onclick) {
            options.onclick();
        }
        
        notification.close();
    };

    notification.onclose = function() {
        if (options.onclose) {
            options.onclose();
        }

        delete pb.notifier.active[options.key];
        pb.dispatchEvent('notifications_changed');
    };
};

pb.notifier.dismiss = function(key) {
    var options = pb.notifier.active[key];
    if (options) {
        options.notification.close();
    }
};
