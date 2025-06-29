// popup.js

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveProfile');
    const scrapeJobButton = document.getElementById('scrapeJob');
    const scrapeProfileButton = document.getElementById('scrapeLinkedInProfile');
    const uploadResumeButton = document.getElementById('uploadResume');

    loadProfile();
    saveButton.addEventListener('click', saveProfile);
    scrapeJobButton.addEventListener('click', scrapeLinkedInJob);
    scrapeProfileButton.addEventListener('click', scrapeLinkedInProfile);
    uploadResumeButton.addEventListener('change', handleResumeUpload);
});

function loadProfile() {
    chrome.storage.local.get(['userProfile'], (result) => {
        if (result.userProfile) {
            const profile = result.userProfile;
            for (let key in profile) {
                const input = document.getElementById(key);
                if (input) input.value = profile[key];
            }
        }
    });
}

function saveProfile() {
    const profile = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        location: document.getElementById('location').value,
        linkedinUrl: document.getElementById('linkedinUrl')?.value || '',
        summary: document.getElementById('summary').value,
        experience: document.getElementById('experience').value,
        skills: document.getElementById('skills').value,
        degree: document.getElementById('degree').value,
        university: document.getElementById('university').value,
        scrapedJob: document.getElementById('scrapedJobData').value,
        scrapedProfile: document.getElementById('scrapedProfileData').value,
        lastUpdated: new Date().toISOString()
    };

    if (!profile.fullName || !profile.email) {
        showStatus('Please fill in at least your name and email.', 'error');
        return;
    }

    chrome.storage.local.set({ userProfile: profile }, () => {
        showStatus('Profile and scraped data saved.', 'success');
    });
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    setTimeout(() => status.style.display = 'none', 3000);
}

function scrapeLinkedInJob() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "SCRAPE_LINKEDIN_JOB" }, (response) => {
            if (chrome.runtime.lastError || !response || !response.text) {
                document.getElementById('scrapedJobData').value = 'Error: Could not scrape job.';
                return;
            }
            document.getElementById('scrapedJobData').value = response.text;
        });
    });
}

function scrapeLinkedInProfile() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "SCRAPE_LINKEDIN_PROFILE" }, (response) => {
            if (chrome.runtime.lastError || !response || !response.text) {
                document.getElementById('scrapedProfileData').value = 'Error: Could not scrape profile.';
                return;
            }
            document.getElementById('scrapedProfileData').value = response.text;
        });
    });
}

function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        document.getElementById('scrapedProfileData').value = reader.result;
        showStatus('Resume uploaded successfully!', 'success');
    };
    reader.readAsText(file);
}
