document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveProfile');
    const scrapeButton = document.getElementById('scrapeJob');
    const scrapeLinkedInButton = document.getElementById('scrapeLinkedIn');

    // Tab functionality
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });

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
    let linkedinUrl = document.getElementById('linkedinUrl').value.trim();
    
    if (!linkedinUrl) {
        showStatus('Please enter a LinkedIn profile URL.', 'error');
        return;
    }
    
    // Prepend https:// if missing
    if (!linkedinUrl.startsWith('http://') && !linkedinUrl.startsWith('https://')) {
        linkedinUrl = 'https://' + linkedinUrl;
    }
    
    // Validate LinkedIn URL format
    if (!linkedinUrl.includes('linkedin.com/in/')) {
        showStatus('Please enter a valid LinkedIn profile URL (e.g., https://www.linkedin.com/in/username).', 'error');
        return;
    }
    
    showStatus('Scraping LinkedIn profile...', 'success');
    
    // Create a new tab with the LinkedIn URL
    chrome.tabs.create({ url: linkedinUrl, active: false }, (tab) => {
        // Wait for the page to load, then scrape
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
                // Remove the listener to avoid multiple calls
                chrome.tabs.onUpdated.removeListener(listener);
                
                // Give the page a moment to fully render
                setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, { action: "SCRAPE_LINKEDIN_PROFILE" }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('Chrome runtime error:', chrome.runtime.lastError);
                            showStatus('Error: Unable to scrape LinkedIn profile. The profile might be private or the URL is invalid.', 'error');
                            chrome.tabs.remove(tab.id); // Close the tab
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
                            
                            showStatus('LinkedIn profile scraped successfully!', 'success');
                            
                            // Save the scraped profile to storage
                            const profile = {
                                fullName: response.profile.fullName || '',
                                email: response.profile.email || '',
                                phone: response.profile.phone || '',
                                location: response.profile.location || '',
                                summary: response.profile.summary || '',
                                projects: response.profile.projects || '',
                                experience: response.profile.experience || '',
                                skills: response.profile.skills || '',
                                degree: response.profile.degree || '',
                                university: response.profile.university || '',
                                lastUpdated: new Date().toISOString()
                            };
                            
                            chrome.storage.local.set({ userProfile: profile }, () => {
                                console.log('Scraped profile saved to storage');
                            });
                            
                        } else {
                            console.log('No valid profile data in response:', response);
                            showStatus('No profile data could be extracted. The profile might be private or the URL is invalid.', 'error');
                        }
                        
                        // Close the tab after scraping (whether successful or not)
                        chrome.tabs.remove(tab.id);
                    });
                }, 2000); // Wait 2 seconds for the page to fully load
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
    let jobUrl = document.getElementById('jobUrl').value.trim();
    
    if (jobUrl) {
        // Prepend https:// if missing
        if (!jobUrl.startsWith('http://') && !jobUrl.startsWith('https://')) {
            jobUrl = 'https://' + jobUrl;
        }
        // Scrape from provided URL
        if (!jobUrl.includes('linkedin.com') && !jobUrl.includes('indeed.com') && !jobUrl.includes('glassdoor.com')) {
            showStatus('Please enter a valid job listing URL from LinkedIn, Indeed, or Glassdoor.', 'error');
            return;
        }
        
        showStatus('Scraping job listing...', 'success');
        
        // Create a new tab with the job URL
        chrome.tabs.create({ url: jobUrl, active: false }, (tab) => {
            // Wait for the page to load, then scrape
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    // Remove the listener to avoid multiple calls
                    chrome.tabs.onUpdated.removeListener(listener);
                    
                    // Give the page a moment to fully render
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tab.id, { action: "SCRAPE_JOB" }, (response) => {
                            if (chrome.runtime.lastError) {
                                document.getElementById('scrapedJobData').textContent = 'Error: Unable to scrape this page.';
                                showStatus('Error: Unable to scrape job listing.', 'error');
                                chrome.tabs.remove(tab.id);
                                return;
                            }
                            if (response && response.text) {
                                document.getElementById('scrapedJobData').textContent = response.text;
                                showStatus('Job listing scraped successfully!', 'success');
                            } else {
                                document.getElementById('scrapedJobData').textContent = 'No job listing content detected.';
                                showStatus('No job content found on this page.', 'error');
                            }
                            
                            // Close the tab after scraping
                            chrome.tabs.remove(tab.id);
                        });
                    }, 2000); // Wait 2 seconds for the page to fully load
                }
            });
        });
    } else {
        // Scrape current page
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "SCRAPE_JOB" }, (response) => {
                if (chrome.runtime.lastError) {
                    document.getElementById('scrapedJobData').textContent = 'Error: Unable to scrape this page.';
                    showStatus('Error: Unable to scrape current page.', 'error');
                    return;
                }
                if (response && response.text) {
                    document.getElementById('scrapedJobData').textContent = response.text;
                    showStatus('Job listing scraped successfully!', 'success');
                } else {
                    document.getElementById('scrapedJobData').textContent = 'No job listing content detected on current page.';
                    showStatus('No job content found on current page.', 'error');
                }
            });
        });
    }
}