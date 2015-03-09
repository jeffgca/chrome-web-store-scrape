'use strict';

var picker = { };
picker.onescape = [];

picker.setUp = function(spec) {
    applyDefaults(spec);

    var inputElement = document.getElementById(spec.inputId);
    var pickerElement = document.getElementById(spec.pickerId);
    var overlayElement = document.getElementById(spec.overlayId);

    var activeRow;
    var updateActive = function() {
        if (activeRow && !activeRow.classList.contains('selected')) {
            activeRow.classList.add('selected');
            activeRow.scrollIntoView();
        }
    };

    inputElement.onfocus = function(e) {
        overlayElement.style.display = 'none';
        inputElement.select();
        delete inputElement.target;
        show();
    };

    inputElement.onclick = function(e) {
        show();
    };

    inputElement.onkeydown = function(e) {
        if (pickerElement.style.display != 'block') {
            return;
        }

        if (e.keyCode == utils.TAB) {
            if (activeRow) {
                activeRow.click();
            } else if (pickerElement.firstChild) {
                 pickerElement.firstChild.click();
            }
        } else if (e.keyCode == utils.ENTER) {
            if (activeRow) {
                activeRow.click();
            } else if (pickerElement.firstChild) {
                 pickerElement.firstChild.click();
            }
        } else if (e.keyCode == utils.UP_ARROW) {
            if (activeRow && activeRow.previousSibling) {
                activeRow.classList.remove('selected');
                activeRow = activeRow.previousSibling;
                updateActive();
            }
        } else if (e.keyCode == utils.DOWN_ARROW) {
            if (!activeRow) {
                activeRow = pickerElement.firstChild;
            } else {
                if (activeRow.nextSibling) {
                    activeRow.classList.remove('selected');
                    activeRow = activeRow.nextSibling;
                }
            }

            updateActive();
        } else {
            show();
        }
    };

    inputElement.onkeyup = function(e) {
        if ([utils.ESC, utils.ENTER, utils.TAB, utils.UP_ARROW, utils.DOWN_ARROW].indexOf(e.keyCode) == -1) {
            show();
        }
    };

    inputElement.onblur = function(e) {
        if (pickerElement.style.display == 'none') {
            return;
        }

        setTimeout(function() {
            hide();
        }, 200);
    };

    overlayElement.onclick = function(e) {
        inputElement.focus();
    };

    var selectRow = function(row, target) {
        row.onclick = null;
        row.classList.remove('selected');
        inputElement.target = target;

        overlayElement.style.display = 'block';
        overlayElement.textContent = '';
        overlayElement.appendChild(row);

        hide();

        if (spec.onselect) {
            spec.onselect(target);
        }
    };
    
    var insertTitleIfNeeded = function(elem) {            
        if(elem.clientWidth < elem.scrollWidth) {
            elem.title = elem.textContent;        
        }
    };

    var show = function() {
        if (!spec.targets) {
            overlayElement.style.display = 'none';
            hide();
            return;
        }

        pickerElement.style.display = 'block';
        pickerElement.textContent = '';

        activeRow = null;

        var filter = inputElement.value.toLowerCase();

        var holder = document.createDocumentFragment();

        if (inputElement.value.length == 0 && spec.showAllDevices) {
            var row = allDevicesRow();
            row.onclick = function() {
                selectRow(row, '*');
                delete localStorage[localStorageKey];
            };

            holder.appendChild(row);
            insertTitleIfNeeded(row.lastChild);
        }

        var visibleDevices = 0;
        spec.targets.devices.map(function(device) {
            var row = deviceRow(device);

            if (filter && row.filterText.indexOf(filter) == -1) {
                return;
            }

            row.onclick = function() {
                selectRow(row, device);
                localStorage[localStorageKey] = device.iden;
            };

            holder.appendChild(row);
            insertTitleIfNeeded(row.lastChild);
            visibleDevices++;
        });

        if (filter.length == 0 && spec.targets.devices.length > 0 && visibleDevices < 2 && spec.showAllDevices) {
            holder.appendChild(addDeviceRow());
        }

        spec.targets.contacts.map(function(contact) {
            var row = contactRow(contact);

            if (filter && row.filterText.indexOf(filter) == -1) {
                return;
            }

            row.onclick = function() {
                selectRow(row, contact);
                localStorage[localStorageKey] = contact.email;
            };

            holder.appendChild(row);
            insertTitleIfNeeded(row.lastChild);
        });

        if (spec.showAddFriends) {
            holder.appendChild(addFriendRow());
        }

        spec.targets.channels.map(function(channel) {
            var row = channelRow(channel);

            if (filter && row.filterText.indexOf(filter) == -1) {
                return;
            }

            row.onclick = function() {
                selectRow(row, channel);
                localStorage[localStorageKey] = channel.tag;
            };

            holder.appendChild(row);
            insertTitleIfNeeded(row.lastChild);
        });

        spec.targets.phonebook.map(function(entry) {
            var row = phonebookEntryRow(entry);

            if (filter && row.filterText.indexOf(filter) == -1) {
                return;
            }

            row.onclick = function() {
                selectRow(row, entry);
                localStorage[localStorageKey] = entry.phone;
            };

            holder.appendChild(row);
            insertTitleIfNeeded(row.lastChild);
        });

        pickerElement.appendChild(holder);

        if (pickerElement.children.length == 0) {
            pickerElement.style.display = 'none';
        }
    };

    var hide = function(restoreSelection) {
        if (pickerElement.style.display == 'none') {
            return false;
        }

        if (restoreSelection && inputElement.value.trim() == '') {
            for (var i = 0; i < pickerElement.children.length; i++) {
                var pickerChild = pickerElement.children[i];
                if (pickerChild.textContent == overlayElement.textContent) {
                    pickerChild.click();
                    break;
                }
            }
        }

        pickerElement.style.display = 'none';

        if (!inputElement.target) {
            delete localStorage[localStorageKey];
        }

        return true;
    };

    picker.onescape.push(hide);

    //
    // Everything is wired above, now select the default target
    //

    var localStorageKey = spec.inputId == 'to' ? 'lastTargetSelected' : spec.inputId + 'LastTargetSelected';
    if (!spec.defaultSelected) {
        try {
            spec.defaultSelected = localStorage[localStorageKey];
        } catch (e) {
            // Why does this even happen?
            // TypeError: Cannot read property 'sms-recipientLastTargetSelected' of null
            //     at Object.picker.setUp (chrome-extension://chlffgpmiacpedhhbkiomidkjlcfhogd/picker.js:236:44)
            //     at chrome-extension://chlffgpmiacpedhhbkiomidkjlcfhogd/panel.js:503:20
            //     at chrome-extension://chlffgpmiacpedhhbkiomidkjlcfhogd/pb.js:571:13
            //     at onResponse (chrome-extension://chlffgpmiacpedhhbkiomidkjlcfhogd/pb.js:166:13)
            //     at XMLHttpRequest.xhr.onreadystatechange (chrome-extension://chlffgpmiacpedhhbkiomidkjlcfhogd/pb.js:193:39)
        }
    }

    var defaultRow;
    if (spec.defaultSelected) {
        spec.targets.devices.map(function(device) {
            if (device.iden == spec.defaultSelected) {
                inputElement.target = device;
                defaultRow = deviceRow(device);
            }
        });

        spec.targets.contacts.map(function(contact) {
            if (contact.email == spec.defaultSelected) {
                inputElement.target = contact;
                defaultRow = contactRow(contact);
            }
        });

        spec.targets.channels.map(function(channel) {
            if (channel.tag == spec.defaultSelected) {
                inputElement.target = channel;
                defaultRow = channelRow(channel);
            }
        });

        spec.targets.phonebook.map(function(entry) {
            if (entry.phone == spec.defaultSelected) {
                inputElement.target = entry;
                defaultRow = phonebookEntryRow(entry);
            }
        });
    }

    if (!defaultRow) {
        if (spec.showAllDevices) {
            defaultRow = allDevicesRow();
            inputElement.target = '*';
        } else {
            if (spec.targets.devices.length > 0) {
                var device = spec.targets.devices[0];
                inputElement.target = device;
                defaultRow = deviceRow(device);
            } else if (spec.targets.contacts.length > 0) {
                var contact = spec.targets.contacts[0];
                inputElement.target = contact;
                defaultRow = contactRow(contact);
            } else if (spec.targets.channels.length > 0) {
                var channel = spec.targets.channels[0];
                inputElement.target = channel;
                defaultRow = channelRow(channel);
            }
        }
    }

    if (defaultRow) {
        selectRow(defaultRow, inputElement.target);
    } else {
        overlayElement.style.display = 'none';
    }
};

var applyDefaults = function(spec) {
    if (!spec.targets) {
        spec.targets = { };
    }

    var targetFields = ['devices', 'contacts', 'channels', 'phonebook'];
    targetFields.map(function(field) {
        if (!spec.targets[field]) {
            spec.targets[field] = [];
        }
    });

    targetFields.map(function(field) {
        spec.targets[field].sort(function(a, b) {
            try {
                var an = a.name.toLowerCase(),
                    bn = b.name.toLowerCase();
                if (an > bn) {
                    return 1;
                } else if (an < bn) {
                    return -1;
                }
            } catch (e) { }
            return 0;
        });
    });
};

var keyup = function(e) {
    if (e.keyCode == utils.ESC) {
        var v = true;
        picker.onescape.map(function(onescape) {
            if (onescape()) {
                v = false;
            }
        });

        return v;
    }
};

if (window.onkeyup && window.onkeyup != keyup) {
    var existing = window.onkeyup;
    window.onkeyup = function(e) {
        if (!existing(e)) {
            keyup(e);
        }
    };
} else {
    window.onkeyup = keyup;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

var allDevicesRow = function() {
    var img = document.createElement('img');
    img.className = 'picker-target-image';
    img.src = 'chip_everything.png';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'picker-target-text';
    nameDiv.textContent = text.get('all_of_my_devices');

    var div = document.createElement('div');
    div.className = 'picker-option';
    div.appendChild(img);
    div.appendChild(nameDiv);

    div.filterText = nameDiv.textContent.toLowerCase();

    return div;
};

var deviceRow = function(device) {
    var img = document.createElement('img');
    img.className = 'picker-target-image';
    img.src = getDeviceChip(device);

    var nameDiv = document.createElement('div');
    nameDiv.className = 'picker-target-text';
    nameDiv.textContent = device.nickname;

    var div = document.createElement('div');
    div.className = 'picker-option';
    div.appendChild(img);
    div.appendChild(nameDiv);

    div.filterText = nameDiv.textContent.toLowerCase();

    return div;
};

var contactRow = function(contact) {
    var name = (contact.name || contact.email) + ' (' + contact.email + ')';

    var div = document.createElement('div');
    div.className = 'picker-option';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'picker-target-text';
    nameDiv.textContent = name;

    if (contact.image_url) {
        var img = document.createElement('img');
        img.className = 'picker-target-image';
        img.src = contact.image_url;
        div.appendChild(img);
    } else {
        var img = document.createElement('img');
        img.className = 'picker-target-image';
        img.src = 'chip_person.png';
        div.appendChild(img);
    }
    
    div.appendChild(nameDiv);

    div.filterText = nameDiv.textContent.toLowerCase();

    return div;
};

var channelRow = function(channel) {
    var div = document.createElement('div');
    div.className = 'picker-option';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'picker-target-text';
    nameDiv.textContent = channel.name + ' (' + channel.tag + ')';

    var img = document.createElement('img');
    img.className = 'picker-target-image';
    if (channel.image_url) {
        var img = document.createElement('img');
        img.className = 'picker-target-image';
        img.src = channel.image_url;
        div.appendChild(img);
    } else {
        var img = document.createElement('img');
        img.className = 'picker-target-image';
        img.src = 'chip_channel.png';
        div.appendChild(img);
    }

    div.appendChild(img);
    div.appendChild(nameDiv);

    div.filterText = nameDiv.textContent.toLowerCase();

    return div;
};

var getDeviceChip = function(device) {
    var browsers = ['chrome', 'firefox', 'safari', 'opera'];
    var desktops = ['windows', 'mac'];

    if (desktops.indexOf(device.type) != -1) {
        return 'chip_desktop.png';
    } else if (browsers.indexOf(device.type) != -1) {
        return 'chip_browser.png';
    } else {
        return 'chip_phone.png';
    }
};

var addDeviceRow = function() {
    var img = document.createElement('img');
    img.className = 'picker-target-image';
    img.src = 'chip_plus.png';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'picker-target-text';
    nameDiv.textContent = text.get('add_a_device');

    var div = document.createElement('div');
    div.className = 'picker-option';
    div.onclick = function() {
        pb.openTab('https://www.pushbullet.com/apps');
    };

    div.appendChild(img);
    div.appendChild(nameDiv);

    div.filterText = nameDiv.textContent.toLowerCase();

    return div;
};

var addFriendRow = function() {
    var img = document.createElement('img');
    img.className = 'picker-target-image';
    img.src = 'chip_plus.png';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'picker-target-text';
    nameDiv.textContent = text.get('add_a_friend');

    var div = document.createElement('div');
    div.className = 'picker-option';
    div.onclick = function() {
        pb.openTab('https://www.pushbullet.com/add-friend');
    };

    div.appendChild(img);
    div.appendChild(nameDiv);

    div.filterText = nameDiv.textContent.toLowerCase();

    return div;
};

var phonebookEntryRow = function(phonebookEntry) {
    var nameDiv = document.createElement('div');
    nameDiv.className = 'picker-target-text';
    nameDiv.textContent = phonebookEntry.name + ' - ' + phonebookEntry.phone;

    var div = document.createElement('div');
    div.className = 'picker-option';

    var phonebookChip = getPhonebookChip(phonebookEntry);
    if (phonebookChip) {
        var img = document.createElement('img');
        img.className = 'picker-target-image';
        img.src = phonebookChip;
        img.title = phonebookEntry.phone_type;

        div.appendChild(img);
    }

    div.appendChild(nameDiv);

    div.filterText = nameDiv.textContent.toLowerCase();

    return div;
};

var getPhonebookChip = function(phonebookEntry) {
    if (!phonebookEntry.phone_type) {
        return '';
    }

    if (phonebookEntry.phone_type == 'mobile') {
        return 'chip_phone.png';
    } else if (phonebookEntry.phone_type == 'home') {
        return 'chip_home.png';
    } else if (phonebookEntry.phone_type == 'work') {
        return 'chip_work.png';
    } else if (phonebookEntry.phone_type == '') {
        return 'chip_other.png';
    } else {
        return 'chip_other.png';
    }
};
