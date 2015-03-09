'use strict';

var textMappings = {
    'sms-warning': 'sms_warning'
};

var params = utils.getParams(location.search);
var pushIden = params['push_iden'];

if (params['height']) {
    window.resizeTo(parseInt(params['width']), parseInt(params['height']));
}

window.init = function() {
    if (window.chrome) {
        chrome.runtime.sendMessage({ 'pushIden': pushIden }, function(response) {
            show(response);
        });
    } else if (window.safari) {
        var listener = function(e) {
            if (e.name == 'conversation_push') {
                show(e.message);
                safari.self.removeEventListener('message', listener, false);
            }
        };

        safari.self.addEventListener('message', listener, false);
        safari.self.tab.dispatchMessage('request_conversation_push');
    } else {
        self.port.emit('request_conversation_push');
        self.port.on('conversation_push', function(push) {
            show(push);
        });
    }
};

var show = function(push) {
    Object.keys(textMappings).map(function(key) {
        document.getElementById(key).textContent = text.get(textMappings[key]); 
    });

    pb.track({
        'name': 'messaging_quickreply_shown',
        'package_name': push.package_name,
        'has_conversation_iden': push.conversation_iden ? true : false
    });

    document.getElementById('container').style.display = 'block';
    
    document.getElementById('image').src = 'data:image/png;base64,' + push.icon;
    document.getElementById('title').textContent = push.title;
    document.getElementById('desc').textContent = 'Via ' + push.application_name;

    var message = document.getElementById('message');
    message.textContent = push.body;
    message.scrollTop = message.scrollHeight;

    var reply = document.getElementById('reply');
    reply.onkeydown = function(e) {
        if (e.keyCode == utils.ENTER && !e.shiftKey) {
            if (reply.value.length > 0) {
                sendReply(push, reply.value);
            }
            return false;
        }
    };

    document.getElementById('sms-warning-link').onclick = function() {
        pb.openTab('https://help.pushbullet.com/articles/why-are-some-text-messages-not-sending/');
    };

    var smsLengthHolder = document.getElementById('sms-length');
    var smsWarning = document.getElementById('sms-warning');
    var smsChange = function() {
        var count = pb.getSmsLength(reply.value);

        smsLengthHolder.textContent = count + "/160";

        if (count > 160) {
            smsWarning.style.display = 'inline';
        } else {
            smsWarning.style.display = 'none';
        }
    };

    reply.addEventListener('input', function() {
        smsChange();
    }, false);

    if (push.package_name != 'com.pushbullet.android') {
        document.getElementById('sms-counter').style.display = 'none';
    }

    var heightNeeded = container.offsetHeight - window.innerHeight;
    window.resizeBy(0, heightNeeded);
};

var sendReply = function(push, message) {
    pb.sendReply(push, message);

    setTimeout(function() {
        window.close();
    }, 120);

    pb.track({
        'name': 'messaging_quickreply_sent',
        'package_name': push.package_name
    });
};

window.onunload = function() {
    try {
        localStorage['quickReplyScreenX'] = window.screenX;
        localStorage['quickReplyScreenY'] = window.screenY;
    } catch (e) {
    }
};
