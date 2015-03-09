chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.tabId) {
        chrome.tabs.sendMessage(message.tabId, message, function(response) {
            sendResponse(response);
        });
        return true; // Required for async sendResponse
    }

    if (message.type == 'log') {
        pb.log(message.message);
    } else if (message.type == 'push') {
        pb.sendPush(message.push);
    } else if (message.type == 'active') {
        pb.dispatchEvent('active');
    } else if (message.type == 'event') {
        pb.track(message.event);
    }
});
