'use strict';

var textMappings = {
    'changelog-tab': 'changelog_tab'
};

window.init = function() {
    pb.track({
        'name': 'goto',
        'url': '/changelog'
    });

    Object.keys(textMappings).map(function(key) {
        document.getElementById(key).textContent = text.get(textMappings[key]); 
    });

    document.getElementById('logo-link').href = pb.www;
}
