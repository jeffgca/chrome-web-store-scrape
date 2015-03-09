'use strict';

var params = utils.getParams(location.search);
var key = params['key'];

window.init = function() {
    if (window.chrome) {
        chrome.runtime.sendMessage({ 'type': 'get_more_options' }, function(response) {
            show(response);
        });
    }
};

var show = function(options) {
    var container = document.getElementById('container');
    container.style.display = 'block';

    document.getElementById('image').src = options.iconUrl;
    document.getElementById('title').textContent = options.title;
    document.getElementById('message').textContent = options.message;
    document.getElementById('context-message').textContent = options.contextMessage;

    var buttons = document.getElementById('buttons');

    for (var i = 0; i < options.buttons.length; i++) {
        var button = options.buttons[i];
        buttons.appendChild(makeButton(button, i));
    }

    var heightNeeded = container.offsetHeight - window.innerHeight;
    if (heightNeeded > 0) {
        window.resizeBy(0, heightNeeded);
    }
};

var makeButton = function(button, index) {
    var label = document.createElement('span');
    label.className = 'notification-small notification-button-label';
    label.textContent = button.title;

    var div = document.createElement('div');
    div.className = 'notification-button notification-bottom-border';

    if (button.iconUrl) {
        var img = document.createElement('img');
        img.className = 'notification-button-icon';
        img.src = button.iconUrl;
        div.appendChild(img);
    }

    div.appendChild(label);

    div.onclick = function() {
        chrome.runtime.sendMessage({ 'type': 'click', 'button_index': index }, function(response) {
        });
    };

    return div;
};
