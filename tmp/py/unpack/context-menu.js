'use strict';

pb.addEventListener('signed_in', function(e) {
    pb.updateContextMenu();

    pb.addEventListener('devices_changed', function(e) {
        pb.updateContextMenu();
    });

    pb.addEventListener('contacts_changed', function(e) {
        pb.updateContextMenu();
    });
});

pb.updateContextMenu = function() {
    if (window.safari) {
        setUpSafariMenu();
    } else if (window.chrome) {
        setUpChromeMenu();
    } else {
        setUpFirefoxMenu();
    }
};

var setUpSafariMenu = function() {
    if (pb.safariListenerAdded) {
        return;
    }

    pb.safariListenerAdded = true;

    safari.application.addEventListener('contextmenu', function(e) {
        if (!pb.options.showContextMenu) {
            return;
        }

        var deviceKeys = pb.local.devices ? Object.keys(pb.local.devices) : [];
        deviceKeys.map(function(key) {
            var device = pb.local.devices[key];
            if (device.type != 'safari') {
                e.contextMenu.appendContextMenuItem('push:' + device.iden, 'Push this to ' + device.nickname);
            }
        });
    }, false);

    safari.application.addEventListener('command', function(e) {
        if (e instanceof SafariExtensionContextMenuItemCommandEvent) {
            var push = {
                'device_iden': e.target.command.split(':')[1]
            };

            var userInfo = e.userInfo;
            if (userInfo.selection.length > 0 && userInfo.tagName != 'A') {
                push.type = 'note';
                push.body = userInfo.selection;
            } else if (userInfo.src) {
                push.type = 'file';
                pb.sendPush(push, userInfo.src);
                return;
            } else {
                push.type = 'link';
                push.title = userInfo.title;
                push.url = userInfo.url;
            }

            pb.sendPush(push);
        }
    }, false);
};

var setUpChromeMenu = function() {
    chrome.contextMenus.removeAll();

    if (!pb.options.showContextMenu) {
        return;
    }

    var contextMenuItemClicked = function(target, info, tab) {
        var push = { };

        if (info.srcUrl) {
            if (pb.options.prefersLinks) {
                push.type = 'link';
                push.title = utils.imageNameFromUrl(info.srcUrl);
                push.url = info.srcUrl;
            } else {
                if (target.email) {
                    push.email = target.email;
                } else {
                    push.device_iden = target.iden;
                }

                pb.sendPush(push, info.srcUrl);
                return;
            }
        } else if (info.linkUrl) {
            push.type = 'link';
            push.title = info.selectionText;
            push.url = info.linkUrl;
        } else if (info.selectionText) {
            push.type = 'note';
            push.body = info.selectionText;
        } else {
            push.type = 'link';
            push.title = tab.title;
            push.url = info.pageUrl;
        }

        if (target.email) {
            push.email = target.email;
        } else {
            push.device_iden = target.iden;
        }

        pb.sendPush(push);
    };

    var contexts = ['page', 'link', 'selection', 'image'];

    var deviceKeys = pb.local.devices ? Object.keys(pb.local.devices) : [];

    deviceKeys.map(function(key) {
        var device = pb.local.devices[key];
        var nickname = device.nickname;

        chrome.contextMenus.create({
            'title': nickname,
            'contexts': contexts,
            'onclick': function(info, tab) {
                contextMenuItemClicked(device, info, tab);
            }
        });
    });

    var contactKeys = pb.local.contacts ? Object.keys(pb.local.contacts) : [];

    if (deviceKeys.length > 0 && contactKeys.length > 0) {
        chrome.contextMenus.create({
            'type': 'separator',
            'contexts': contexts
        });
    }

    contactKeys.map(function(key) {
        var contact = pb.local.contacts[key];
        chrome.contextMenus.create({
            'title': contact.name,
            'contexts': contexts,
            'onclick': function(info, tab) {
                contextMenuItemClicked(contact, info, tab);
            }
        });
    });
};

var setUpFirefoxMenu = function() {
    self.port.emit('update_context_menu');

    if (!pb.options.showContextMenu) {
        return;
    }

    var entries = [];

    if (pb.local.devices) {
        Object.keys(pb.local.devices).map(function(key) {
            var device = pb.local.devices[key];
            entries.push({
                'type': 'device',
                'label': device.nickname,
                'device_iden': device.iden
            });
        });
    }

    if (pb.local.contacts) {
        Object.keys(pb.local.contacts).map(function(key) {
            var contact = pb.local.contacts[key];
            entries.push({
                'type': 'contact',
                'label': contact.name,
                'email': contact.email
            });
        });
    }

    self.port.emit('update_context_menu', entries);
};

if (window.chrome) {

} else if (window.safari) {
    pb.addEventListener('signed_out', function(e) {
        delete pb.safariListenerAdded;
    });
} else {
    self.port.on('context_menu_item_clicked', function(info) {
        var push = { };

        var message = info.message;
        if (message.url) {
            push.type = 'link';
            push.title = message.title;
            push.url = message.url;
        } else if (message.selection) {
            push.type = 'note';
            push.body = message.selection;
        } else {
            return;
        }

        var entry = info.entry;
        if (entry.type == 'device') {
            push.device_iden = entry.device_iden;
        } else if (entry.type == 'contact') {
            push.email = entry.email;
        } else {
            return;
        }

        pb.sendPush(push);
    });
}
