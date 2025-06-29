// popup.js (This is the same as the previously configured version)
document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveProfile');
    const scrapeJobButton = document.getElementById('scrapeJob');
    const scrapeProfileButton = document.getElementById('scrapeLinkedInProfile');
    const resumeUploader = document.getElementById('uploadResume');
    loadProfile();
    saveButton.addEventListener('click', saveProfile);
    scrapeJobButton.addEventListener('click', scrapeLinkedInJob);
    scrapeProfileButton.addEventListener('click', scrapeLinkedInProfile);
    resumeUploader.addEventListener('change', handleResumeUpload);
});

function fillForm(data) {
    if (!data) return;
    for (const key in data) {
        const element = document.getElementById(key);
        if (element) {
            element.value = data[key];
        }
    }
}

function loadProfile() {
    chrome.storage.local.get(['userProfile'], (result) => {
        if (result.userProfile) {
            fillForm(result.userProfile);
            if(result.userProfile.scrapedJob) document.getElementById('scrapedJobData').value = result.userProfile.scrapedJob;
            if(result.userProfile.scrapedProfile) document.getElementById('scrapedProfileData').value = result.userProfile.scrapedProfile;
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
        education: document.getElementById('education').value,
        skills: document.getElementById('skills').value,
        scrapedJob: document.getElementById('scrapedJobData').value,
        scrapedProfile: document.getElementById('scrapedProfileData').value,
        lastUpdated: new Date().toISOString()
    };

    if (!profile.fullName || !profile.email) {
        showStatus('Please fill in at least Name and Email.', 'error');
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
    setTimeout(() => {
        status.style.display = 'none';
        status.textContent = '';
    }, 4000);
}

function scrapeLinkedInJob() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.url.includes('linkedin.com')) {
            showStatus('This only works on LinkedIn pages.', 'error');
            return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { action: "SCRAPE_LINKEDIN_JOB" }, (response) => {
            if (chrome.runtime.lastError) {
                showStatus('Could not connect. Reload the LinkedIn page and try again.', 'error');
                return;
            }
            if (!response || !response.jobDescription) {
                showStatus('Failed to scrape job. Is this a job posting page?', 'error');
                return;
            }
            document.getElementById('scrapedJobData').value = response.jobDescription;
            showStatus('Job description scraped!', 'success');
        });
    });
}

function scrapeLinkedInProfile() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.url.includes('linkedin.com')) {
            showStatus('This only works on LinkedIn pages.', 'error');
            return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { action: "SCRAPE_LINKEDIN_PROFILE" }, (response) => {
             if (chrome.runtime.lastError) {
                showStatus('Could not connect. Reload the LinkedIn page and try again.', 'error');
                return;
            }
            if (!response || !response.profileData || !response.profileData.fullName) {
                showStatus('Failed to scrape profile. Is this a profile page?', 'error');
                return;
            }
            fillForm(response.profileData);
            document.getElementById('scrapedProfileData').value = JSON.stringify(response.profileData, null, 2);
            showStatus('Profile scraped and fields filled!', 'success');
        });
    });
}

function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        document.getElementById('scrapedProfileData').value = content;
        
        let parsedData;
        if(file.type === "application/json"){
            try {
                parsedData = JSON.parse(content);
            } catch (err) {
                showStatus("Error parsing JSON resume.", "error"); return;
            }
        } else {
            parsedData = parsePlainTextResume(content);
        }
        fillForm(parsedData);
        showStatus('Resume uploaded and fields filled!', 'success');
    };

    if(file.type === "application/json" || file.type === "text/plain"){
        reader.readAsText(file);
    } else {
        showStatus("Unsupported file type. Please upload .txt or .json.", "error");
    }
}

function parsePlainTextResume(text) {
    const data = {};
    const lines = text.split('\n');
    data.fullName = lines[0] || '';
    const emailLine = lines.find(line => line.includes('@'));
    if (emailLine) data.email = emailLine.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || '';

    const sections = text.split(/\n\s*(Experience|Education|Skills|Summary|About)\s*\n/i);
    for(let i = 1; i < sections.length; i += 2) {
        const sectionName = sections[i].toLowerCase();
        const sectionContent = sections[i+1].trim();
        if (sectionName === 'summary' || sectionName === 'about') data.summary = sectionContent;
        if (sectionName === 'experience') data.experience = sectionContent;
        if (sectionName === 'education') data.education = sectionContent;
        if (sectionName === 'skills') data.skills = sectionContent;
    }
    return data;
}
