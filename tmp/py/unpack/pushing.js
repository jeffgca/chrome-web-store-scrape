'use strict';

pb.sendPush = function(push, imageUrl) {
    if (pb.local.device) {
        push.source_device_iden = pb.local.device.iden;
    }

    if (push.file) {
        var file = push.file;
        delete push.file;

        push.file_name = file.name;
        push.file_type = file.type;

        pushFile(push, file);
    } else if (imageUrl) {
        fetchImage(imageUrl, function(blob) {
            push.file_name = utils.imageNameFromUrl(imageUrl);
            push.file_type = blob.type;
            pushFile(push, blob);
        });
    } else if (push.type == 'link' && (!push.url || push.url.indexOf('file://') == 0
                                                 || push.url.indexOf('chrome://') == 0
                                                 || push.url.indexOf('chrome-extension://') == 0)) {
        pushFailed(push);
    } else {
        pb.post(pb.api + '/v2/pushes', push, function(response) {
            if (response) {
                pushSucceeded(response);
            } else {
                pushFailed(push);
            }
        });

        pb.dispatchEvent('active');
    }
};

var pushFile = function(push, blob) {
    var getString = pb.api + '/v2/upload-request' +
        '?file_name=' + encodeURIComponent(push.file_name) +
        '&file_type=' + encodeURIComponent(push.file_type);

    pb.get(getString, function(response) {
        if (response) {
            var formData = new FormData();
            for (var key in response.data) {
                if (response.data.hasOwnProperty(key)) {
                    formData.append(key, response.data[key]);
                }
            }
            formData.append('file', blob);

            var xhr = new XMLHttpRequest();
                xhr.open('POST', response.upload_url, true);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4 && xhr.status == 204) {
                        push.type = 'file';
                        push.file_name = response.file_name;
                        push.file_type = response.file_type;
                        push.file_url = response.file_url;
                        pb.sendPush(push);
                    }
                };
                xhr.send(formData);
        } else {
            pushFailed(push);
        }
    });
};

var fetchImage = function(url, done) {
    if (url.substring(0, 4) == 'data') {
        done(utils.base64ToBlob(url.split(',')[1], url.split(';')[0].split(':')[1]));
    } else {
        var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.responseType = 'blob';
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    done(xhr.response);
                }
            };
            xhr.send();
    }
};

var pushSucceeded = function(push) {
    pb.showToast(text.get('pushed_successfully'));
};

var pushFailed = function(push) {
    pb.showToast(text.get('push_failed'));
};
