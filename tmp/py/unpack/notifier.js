'use strict';

pb.notifier = { };
pb.notifier.active = { };

var listenersSetUp;
pb.notifier.show = function(options) {
    pb.log('Showing notification ' + options.key);

    options.allButtons = options.buttons;

    pb.dispatchEvent('active');

    if (pb.options.onlyShowTitles) {
        options.message = '';
    }

    pb.notifier.notify(options);
};

pb.notifier.dismiss = function(key) {
    // Stub, overwritten in notifications-chrome.js etc.
};

if (Object.observe) {
    Object.observe(pb.notifier.active, function(change) {
        pb.dispatchEvent('notifications_changed');
    });
}
