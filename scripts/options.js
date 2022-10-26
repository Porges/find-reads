const saveButton = document.getElementById('save');
const uriList = document.getElementById('uri-list');

function save_options() {
    const uris = uriList.value.trim().split(/(?:\s|\n)+/).filter(x => x !== '');
    chrome.storage.sync.set({ uris }, () => {
        uriList.value = uris.join('\n');
        saveButton.disabled = true;
    });
}

function restore_options() {
    chrome.storage.sync.get({
        uris: []
    }, items => {
        uriList.value = items.uris.join('\n');
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
saveButton.addEventListener('click', save_options);
uriList.addEventListener('input', () => {
    saveButton.disabled = false;
});
