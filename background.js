// background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log('Job Application Assistant extension installed.');
});

// Listen for tab updates to inject the content script if it hasn't been already.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => window.hasOwnProperty('jobAssistantLoaded'),
        }, (results) => {
            // Check if the script has already been injected.
            if (chrome.runtime.lastError || !results || results[0].result) {
                return; // Already loaded or an error occurred.
            }

            // If not loaded, inject the content script.
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }).then(() => {
                console.log('Injected content script into tab:', tabId);
            }).catch(err => console.error('Failed to inject content script:', err));
        });
    }
});
