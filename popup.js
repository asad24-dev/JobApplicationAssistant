document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveProfile');
    const scrapeButton = document.getElementById('scrapeJob');
    const scrapeLinkedInButton = document.getElementById('scrapeLinkedIn');

    loadProfile();
    saveButton.addEventListener('click', saveProfile);
    scrapeButton.addEventListener('click', scrapeJob);
    scrapeLinkedInButton.addEventListener('click', scrapeLinkedInProfile);

    // Listen for messages from the content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "PROFILE_UPDATED") {
            console.log("Profile update message received, reloading profile.");
            loadProfile();
        }
    });
});

function loadProfile() {
    chrome.storage.local.get(['userProfile'], (result) => {
        console.log('Loading profile from storage:', result.userProfile);
        if (result.userProfile) {
            const profile = result.userProfile;
            
            document.getElementById('fullName').value = profile.fullName || '';
            document.getElementById('email').value = profile.email || '';
            document.getElementById('phone').value = profile.phone || '';
            document.getElementById('location').value = profile.location || '';
            document.getElementById('summary').value = profile.summary || '';
            document.getElementById('experience').value = profile.experience || '';
            document.getElementById('skills').value = profile.skills || '';
            document.getElementById('degree').value = profile.degree || '';
            document.getElementById('university').value = profile.university || '';
            
            console.log('Form fields populated with:', profile);
        } else {
            console.log('No profile data found in storage');
        }
    });
}

function saveProfile() {
    const profile = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        location: document.getElementById('location').value,
        summary: document.getElementById('summary').value,
        experience: document.getElementById('experience').value,
        skills: document.getElementById('skills').value,
        degree: document.getElementById('degree').value,
        university: document.getElementById('university').value,
        lastUpdated: new Date().toISOString()
    };

    // Validate required fields
    if (!profile.fullName || !profile.email) {
        showStatus('Please fill in at least your name and email address.', 'error');
        return;
    }

    chrome.storage.local.set({ userProfile: profile }, () => {
        console.log('Profile saved');
        showStatus('Profile saved successfully!', 'success');
    });
}

function scrapeLinkedInProfile() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        
        // Check if we're on a LinkedIn profile page
        if (!currentTab.url.includes('linkedin.com') || !currentTab.url.includes('/in/')) {
            showStatus('Please navigate to a LinkedIn profile page first.', 'error');
            return;
        }
        
        chrome.tabs.sendMessage(currentTab.id, { action: "SCRAPE_LINKEDIN_PROFILE" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                showStatus('Error: Unable to scrape LinkedIn profile. Make sure you are on a LinkedIn profile page.', 'error');
                return;
            }
            
            if (response && response.profile) {
                console.log('Profile data received:', response.profile);
                document.getElementById('fullName').value = response.profile.fullName || '';
                document.getElementById('email').value = response.profile.email || '';
                document.getElementById('phone').value = response.profile.phone || '';
                document.getElementById('location').value = response.profile.location || '';
                document.getElementById('summary').value = response.profile.summary || '';
                document.getElementById('projects').value = response.profile.projects || '';
                document.getElementById('experience').value = response.profile.experience || '';
                document.getElementById('skills').value = response.profile.skills || '';
                document.getElementById('degree').value = response.profile.degree || '';
                document.getElementById('university').value = response.profile.university || '';
                console.log('Form fields populated with:', response.profile);
                // Save the scraped profile to storage
                
            } else {
                console.log('No valid profile data in response:', response);
                showStatus('No profile data could be extracted from this page.', 'error');
            }
        });
    });
}

function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

function scrapeJob() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "SCRAPE_JOB" }, (response) => {
            if (chrome.runtime.lastError) {
                document.getElementById('scrapedJobData').value = 'Error: Unable to scrape this page.';
                return;
            }
            if (response && response.text) {
                document.getElementById('scrapedJobData').value = response.text;
            } else {
                document.getElementById('scrapedJobData').value = 'No job listing content detected.';
            }
        });
    });
}