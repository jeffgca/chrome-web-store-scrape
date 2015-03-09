var pb = { };

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type == 'show_toast') {
        pb.showToast(message.text);
    }
});

pb.showToast = function(text) {
    var toast = document.createElement('div');
    toast.setAttribute('style', '-webkit-transition:opacity .2s ease-in;opacity:0;position:absolute;bottom:50px;left:50%;width:300px;margin-left:-150px;z-index:16777270;color:white;text-align:center;background-color:rgba(0,0,0,.5);border-radius:30px;padding:10px;font-size:16px;');
    toast.textContent = text;

    document.body.insertBefore(toast, document.body.firstChild);

    setTimeout(function() {
        toast.style.opacity = 1;
    }, 10);

    setTimeout(function() {
        toast.style.opacity = 0;
    }, 2000);

    setTimeout(function() {
        document.body.removeChild(toast);
    }, 2200);
};

pb.log = function(message) {
    chrome.runtime.sendMessage({ 'type': 'log', 'message': message });
};
