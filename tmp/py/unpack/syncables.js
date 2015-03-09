'use strict';

var types = ['devices', 'contacts', 'grants', 'subscriptions', 'channels', 'pushes'];

pb.addEventListener('signed_in', function() {
    pb.syncing = { };

    types.map(function(type) {
        try {
            pb.local[type] = localStorage[type] ? JSON.parse(localStorage[type]) : { };
        } catch (e) {
            pb.local[type] = { };
            delete localStorage[type + 'Bootstrapped'];
            delete localStorage[type];
        }
    });

    pb.local.asArray = function(type) {
        var array = [];

        Object.keys(pb.local[type]).map(function(key) {
            array.push(pb.local[type][key]);
        });

        array.sort(function(a, b) {
            return b.modified - a.modified;
        });

        return array;
    };

    pb.addEventListener('connected', function() {
        pb.sync();
    });

    pb.addEventListener('stream_message', function(e) {
        var message = e.detail;
        if (message.type == 'tickle') {
            pb.sync();
        }
    });
});

pb.addEventListener('signed_out', function(e) {
    pb.syncing = { };
});

pb.sync = function(backoff) {
    var bootstrapped = true;

    types.map(function(type) {
        if (!localStorage[type + 'Bootstrapped']) {
            bootstrapped = false;
            syncInternal(type, backoff);
        }
    });

    if (bootstrapped) {
        syncInternal('everything', backoff);
    }    
};

var syncInternal = function(type, backoff) {
    if (!type) {
        type = 'everything';
    }

    if (!backoff) {
        backoff = 10 * 1000;
    }

    if (pb.syncing[type]) {
        pb.pendingSync = true;
        return;
    }

    pb.syncing[type] = true;
    delete pb.pendingSync;
    clearTimeout(pb.syncTimeout);

    var modifiedAfter = type == 'everything' ? parseFloat(localStorage['modifiedAfter']) || 0 : 0;
    var cursor = localStorage[type + 'Cursor'];
    var url = pb.api + '/v2/' + type;

    if (cursor) {
        url += '?cursor=' + cursor;
    } else {
        url += '?modified_after=' + modifiedAfter;
    }

    if (modifiedAfter == 0) {
        url += '&active_only=true';
    }

    pb.get(url, function(response) {
        delete pb.syncing[type];

        if (response) {
            var cursor = type == 'pushes' ? '' : response.cursor || '';
            localStorage[type + 'Cursor'] = cursor;

            if (type == 'everything') {
                types.map(function(type) {
                    var syncables = response[type];
                    ingest(type, syncables, cursor);
                });
            } else {
                ingest(type, response[type], cursor);

                if (!cursor) {
                    localStorage[type + 'Bootstrapped'] = true;
                }
            }
        } else {
            pb.log('Sync failed, scheduling retry');

            clearTimeout(pb.syncTimeout);
            pb.syncTimeout = setTimeout(function() {
                pb.sync(Math.min(backoff * 2, 10 * 60 * 1000));
            }, backoff);
        }

        if (pb.pendingSync || cursor) {
            syncInternal(type, backoff);
        }
    });
};

var ingest = function(type, syncables, cursor) {
    var locals = pb.local[type];

    syncables.map(function(syncable) {
        if (syncable.active && syncable.pushable !== false) {
            locals[syncable.iden] = syncable;
        } else {
            delete locals[syncable.iden];
        }

        localStorage['modifiedAfter'] = Math.max(syncable.modified, parseFloat(localStorage['modifiedAfter']) || 0);
    });

    if (type == 'pushes') {
        var keys = Object.keys(locals);
        if (keys.length > 500) {
            var array = pb.local.asArray(type);

            locals = { };
            array.slice(0, 500).map(function(syncable) {
                locals[syncable.iden] = syncable;
            });
        }
    }

    localStorage[type] = JSON.stringify(locals);

    pb.local[type] = locals;

    if (!cursor) {
        pb.dispatchEvent(type + '_changed');
    }
};
