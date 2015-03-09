'use strict';

pb.addEventListener('signed_in', function() {
    pb.visibleGroups = { };

    pb.addEventListener('pushes_changed', function() {
        var notifyAfter = parseFloat(localStorage.notifyAfter) || 0;

        var pushes = pb.local.asArray('pushes').filter(function(push) {
            return push.modified > notifyAfter;
        });

        if (localStorage.notifierArmed) {
            pushes = pushes.filter(function(push) {
                return needsNotifying(push);
            });

            if (pushes.length > 0) {
                localStorage.notifyAfter = pushes[pushes.length - 1].modified - 10;
            }

            utils.wrap(function() {
                updateNotifications(groupify(pushes));
            });
        } else {
            localStorage.notifierArmed = true;
            localStorage.notifyAfter = pushes.length > 0 ? pushes[0].modified : 0;
        }
    });
});

var needsNotifying = function(push) {
    if (push.dismissed) {
        return;
    } else if (push.source_device_iden && !push.target_device_iden && push.source_device_iden == pb.local.device.iden) {
        pb.log('To "All devices" from this device, not notifying');
        return;
    } else if (push.target_device_iden && pb.local.device && push.target_device_iden != pb.local.device.iden) {
        return;
    } else if (push.receiver_iden != pb.local.user.iden && !push.channel_iden && !push.client_iden) {
        return;
    } else if (Date.now() - (push.created * 1000) > 48 * 60 * 60 * 1000) {
        pb.log('Push created >48 hours ago, marking dismissed locally');
        push.dismissed = true;
        return;
    }

    var types = ['note', 'link', 'address', 'list', 'file'];
    if (types.indexOf(push.type) == -1) {
        pb.log('Not notifying for unknown push of type ' + push.type);
        return;
    }

    // Fix link urls
    if (push.type == 'link') {
        if (!push.url || push.url.length == 0) {
            push.type = 'note';
        } else {
            push.url = push.url ? push.url.trim() : '';
            if (push.url.indexOf('://') == -1) {
                push.url = 'http://' + push.url;
            }
        }

    }

    return push;
};

var updateNotifications = function(groups) {
    var keys = Object.keys(groups).concat(Object.keys(pb.visibleGroups));

    var all = { };
    keys.map(function(key) {
        all[key] = true;
    });

    Object.keys(all).map(function(key) {
        var group = groups[key];
        var visible = pb.visibleGroups[key];

        var existing = pb.notifier.active[key];

        if (!group || group.length == 0) {
            if (existing) {
                existing.onclose = function() {
                    delete pb.visibleGroups[key];
                };
            }

            pb.notifier.dismiss(key);
            return;
        }

        var dontAlert = visible && visible.length >= group.length;

        var firstPush = group[0];

        var options = { };
        options.key = key;

        if (group.length == 1) {
            options.type = 'basic';
            options.title = firstPush.name || firstPush.title || firstPush.file_name || '';
            options.message = firstPush.body || firstPush.url || firstPush.address || '';

            if (firstPush.image_url) {
                if (!pb.options.onlyShowTitles) {
                    options.type = 'image';
                    options.imageUrl = firstPush.image_url + '?fit=crop&crop=faces&dpr=2&w=360&h=240';
                }
            } else if (firstPush.type == 'list') {
                options.type = 'list';
                options.items = [];
                if (firstPush.items && firstPush.items.length) {
                    firstPush.items.map(function(item) {
                        options.items.push({
                            'title': item.checked ? '\u2713' : '  ',
                            'message': item.text || ''
                        });
                    });
                }
            }
        } else {
            options.type = 'list';
            options.title = String.format(text.get('num_new_pushes'), group.length);
            options.items = [];

            group.map(function(push) {
                options.items.push({
                    'title': push.name || push.title || push.file_name || '',
                    'message': push.body || ''
                });
            });
        }

        options.buttons = [];

        if (firstPush.channel_iden) {
            Object.keys(pb.local.subscriptions).map(function(key) {
                var subscription = pb.local.subscriptions[key];
                if (subscription.channel.iden == firstPush.channel_iden) {
                    options.buttons.push({
                        'title': String.format(text.get('unsubscribe_from_channel'), subscription.channel.name),
                        'iconUrl': 'ic_action_halt.png',
                        'onclick': function() {
                            pb.track({
                                'name': 'unsubscribe',
                                'channel_tag': subscription.channel.tag
                            });

                            var undo = {
                                'type': 'basic',
                                'key': options.key,
                                'title': String.format(text.get('unsubscribed_from_channel'), subscription.channel.name),
                                'message': '',
                                'iconUrl': options.iconUrl
                            };

                            undo.buttons = [{
                                'title': text.get('undo'),
                                'iconUrl': 'ic_action_undo.png',
                                'onclick': function() {
                                    delete undo.onclose;
                                }
                            }];

                            undo.buttons.push({
                                'title': text.get('done'),
                                'iconUrl': 'ic_action_tick.png',
                                'onclick': function() {
                                }
                            });

                            undo.onclose = function() {
                                pb.del(pb.api + '/v2/subscriptions/' + subscription.iden, function(response) {
                                    if (response) {
                                        pb.log('Unsubscribed from ' + subscription.channel.name);
                                    } else {
                                        pb.log('Failed to unsubscribe from ' + subscription.channel.name);
                                    }
                                });
                            };

                            pb.notifier.show(undo);

                            setTimeout(function() {
                                pb.notifier.dismiss(undo.key);
                            }, 5000);
                        }
                    });
                }
            });
        }

        options.buttons.push({
            'title': text.get('dismiss'),
            'iconUrl': 'ic_action_cancel.png',
            'onclick': function() {
            }
        });

        options.onclick = function() {
            var url;
            if (group.length == 1) {
                if (firstPush.type == 'link') {
                    url = firstPush.url;
                } else if (firstPush.type == 'file') {
                    url = firstPush.file_url;
                } else if (firstPush.type == 'address') {
                    url = 'https://maps.google.com?q=' + escape(firstPush.address);
                } else {
                    url = pb.www + '/?push_iden=' + firstPush.iden;
                }
            } else {
                var param = key.indexOf('@') == -1 ? 'iden' : 'email';
                url = pb.www + '/?' + param + '=' + key;
            }

            pb.openTab(url);
        };

        options.onclose = function() {
            delete pb.visibleGroups[key];
            group.map(function(push) {
                push.dismissed = true;
            });
            group.map(function(push) {
                markDismissed(push);
            });
        };

        if (firstPush.channel_iden) {
            Object.keys(pb.local.subscriptions).map(function(key) {
                var subscription = pb.local.subscriptions[key];
                if (subscription.channel.iden == firstPush.channel_iden) {
                    options.iconUrl = subscription.channel.image_url;
                    options.contextMessage = String.format(text.get('context_message'),
                                                           subscription.channel.name,
                                                           new Date().toLocaleTimeString().replace(/:\d+ /, ' '));
                }
            });
        } else if (firstPush.client_iden) {
            Object.keys(pb.local.grants).map(function(key) {
                var grant = pb.local.grants[key];
                if (grant.client.iden == firstPush.client_iden) {
                    options.iconUrl = grant.client.image_url;
                    options.contextMessage = String.format(text.get('context_message'),
                                                           grant.client.name,
                                                           new Date().toLocaleTimeString().replace(/:\d+ /, ' '));
                }
            });
        } else if (pb.local.user.iden != firstPush.sender_iden) {
            Object.keys(pb.local.contacts).map(function(key) {
                var contact = pb.local.contacts[key];
                if (contact.email_normalized == firstPush.sender_email_normalized) {
                    options.iconUrl = contact.image_url;
                    options.contextMessage = String.format(text.get('from'), contact.name);
                }
            });

            if (!options.contextMessage) {
                options.contextMessage = String.format(text.get('from'), firstPush.sender_email_normalized);
            }
        }

        if (!options.iconUrl) {
            options.iconUrl = 'icon_48.png';
        }

        if (existing
            && existing.type == options.type
            && existing.title == options.title
            && existing.body == options.body) {
            return;
        }

        pb.log('Notifying for group ' + key);
        pb.log(group);

        if (group.length == 1 && pb.local.device && firstPush.target_device_iden == pb.local.device.iden) {
            if (!isFromSomeoneElse(firstPush) && pb.options.openMyLinksAutomatically) {
                firstPush.dismissed = true; // Burst bugfix for issue noticed by Schwers, caused by next line
                setTimeout(function() { // Let other Chromes open? Blah
                    options.onclick();
                    options.onclose();
                }, 1000);
            } else {
                pb.notifier.show(options, dontAlert);
            }
        } else {
            pb.ifNoNativeClientRunning(function() {
                pb.notifier.show(options, dontAlert);
            });
        }
    });

    pb.visibleGroups = groups; 
};

var markDismissed = function(push) {
    pb.post(pb.api + '/v2/pushes/' + push.iden,
        { 'dismissed': true },
        function(response) {
            if (response) {
                pb.log('Marked push ' + push.iden + ' dismissed');
            } else {
                pb.log('Failed to mark push ' + push.iden + 'dismissed, server returned ' + status);
            }
        }
    );
};

var groupify = function(pushes) {
    var groups = { };
    pushes.map(function(push) {
        var key = getGroupKey(push);
        var group = groups[key];
        if (!group) {
            group = [];
            groups[key] = group;
        }
        group.push(push);
    });

    return groups;
};

var getGroupKey = function(push) {
    return isFromSomeoneElse(push) ? push.channel_iden || push.client_iden || push.sender_email_normalized || push.iden
                                   : push.iden;
};

var isFromSomeoneElse = function(push) {
    return pb.channel_iden || pb.client_iden || push.sender_iden != pb.local.user.iden;
};
