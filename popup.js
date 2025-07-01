// Debug: Check if PDFParser is loaded
window.addEventListener('load', () => {
    console.log('Window loaded. PDFParser available:', typeof PDFParser !== 'undefined');
    if (typeof PDFParser === 'undefined') {
        console.error('PDFParser class is not available. Check if pdf-parser.js is loaded correctly.');
    }
});

// PDF parser will be initialized when needed
let pdfParser = null;

document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveProfile');
    const saveJobButton = document.getElementById('saveJob');
    const scrapeButton = document.getElementById('scrapeJob');
    const scrapeLinkedInButton = document.getElementById('scrapeLinkedIn');
    const parseResumeButton = document.getElementById('parseResume');
    const resumeFileInput = document.getElementById('resumePdf');

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

    // File input change handler
    resumeFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const parseButton = document.getElementById('parseResume');
        const parseStatus = document.getElementById('parseStatus');
        
        if (file) {
            if (file.type !== 'application/pdf') {
                parseStatus.textContent = 'Please select a PDF file.';
                parseStatus.style.color = '#dc3545';
                parseButton.disabled = true;
                return;
            }
            
            parseStatus.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            parseStatus.style.color = '#28a745';
            parseButton.disabled = false;
        } else {
            parseStatus.textContent = '';
            parseButton.disabled = true;
        }
    });

    loadProfile();
    saveButton.addEventListener('click', saveProfile);
    saveJob.addEventListener('click', saveJob);
    scrapeButton.addEventListener('click', scrapeJob);
    scrapeLinkedInButton.addEventListener('click', scrapeLinkedInProfile);
    parseResumeButton.addEventListener('click', parseResume);

    // Add test button event listener
    const testPdfJsButton = document.getElementById('testPdfJs');
    testPdfJsButton.addEventListener('click', testPdfJsLibrary);

    // Add manual text parsing button event listener
    const parseManualTextButton = document.getElementById('parseManualText');
    parseManualTextButton.addEventListener('click', parseManualText);

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
function saveJob() {
    const jobDescription = document.getElementById('scrapedJobData').textContent.trim();
    
    if (!jobDescription) {
        showStatus('No job description to save. Please scrape a job first.', 'error');
        return;
    }
    
    // Save the job description to storage
    chrome.storage.local.set({ scrapedJob: jobDescription }, () => {
        console.log('Job description saved:', jobDescription);
        showStatus('Job description saved successfully!', 'success');
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

async function parseResume() {
    const fileInput = document.getElementById('resumePdf');
    const parseStatus = document.getElementById('parseStatus');
    const file = fileInput.files[0];
    
    if (!file) {
        showStatus('Please select a PDF file first.', 'error');
        return;
    }
    
    try {
        parseStatus.textContent = 'Initializing PDF parser...';
        parseStatus.style.color = '#007bff';
        showStatus('Initializing PDF parser...', 'success');
        
        // Initialize PDF parser with PDF.js
        if (!pdfParser) {
            pdfParser = new PDFParser();
        }
        
        await pdfParser.init(); // Explicitly initialize
        
        parseStatus.textContent = 'Parsing PDF... This may take a moment.';
        showStatus('Extracting text from PDF...', 'success');
        
        // Extract text from PDF
        const extractedText = await pdfParser.extractTextFromPDF(file);
        console.log('Extracted text length:', extractedText.length);
        
        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('No text could be extracted from the PDF. Make sure the PDF contains selectable text (not scanned images).');
        }
        
        parseStatus.textContent = 'Analyzing resume content...';
        showStatus('Analyzing resume content...', 'success');
        
        // Parse profile data from extracted text
        const parsedProfile = pdfParser.parseProfileFromText(extractedText);
        
        // Populate form fields with parsed data
        if (parsedProfile.fullName) document.getElementById('fullName').value = parsedProfile.fullName;
        if (parsedProfile.email) document.getElementById('email').value = parsedProfile.email;
        if (parsedProfile.phone) document.getElementById('phone').value = parsedProfile.phone;
        if (parsedProfile.location) document.getElementById('location').value = parsedProfile.location;
        if (parsedProfile.summary) document.getElementById('summary').value = parsedProfile.summary;
        if (parsedProfile.projects) document.getElementById('projects').value = parsedProfile.projects;
        if (parsedProfile.experience) document.getElementById('experience').value = parsedProfile.experience;
        if (parsedProfile.skills) document.getElementById('skills').value = parsedProfile.skills;
        if (parsedProfile.degree) document.getElementById('degree').value = parsedProfile.degree;
        if (parsedProfile.university) document.getElementById('university').value = parsedProfile.university;
        
        // Save parsed profile to storage
        const profileToSave = {
            fullName: parsedProfile.fullName || '',
            email: parsedProfile.email || '',
            phone: parsedProfile.phone || '',
            location: parsedProfile.location || '',
            summary: parsedProfile.summary || '',
            projects: parsedProfile.projects || '',
            experience: parsedProfile.experience || '',
            skills: parsedProfile.skills || '',
            degree: parsedProfile.degree || '',
            university: parsedProfile.university || '',
            lastUpdated: new Date().toISOString()
        };
        
        chrome.storage.local.set({ userProfile: profileToSave }, () => {
            console.log('Parsed profile saved to storage:', profileToSave);
        });
        
        parseStatus.textContent = 'Resume parsed successfully!';
        parseStatus.style.color = '#28a745';
        showStatus('Resume parsed and profile updated successfully!', 'success');
        
        // Clear file input
        fileInput.value = '';
        document.getElementById('parseResume').disabled = true;
        
    } catch (error) {
        console.error('Error parsing resume:', error);
        parseStatus.textContent = 'Error parsing resume: ' + error.message;
        parseStatus.style.color = '#dc3545';
        showStatus('Error parsing resume: ' + error.message, 'error');
    }
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

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];

    chrome.scripting.executeScript(
        {
            target: { tabId: tab.id },
            files: ['content.js']
        },
        () => {
            // Then send message
            chrome.tabs.sendMessage(tab.id, { action: "SCRAPE_JOB" }, (response) => {
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
        }
    );
});


async function testPdfJsLibrary() {
    const parseStatus = document.getElementById('parseStatus');
    
    try {
        parseStatus.textContent = 'Testing PDF parser initialization...';
        parseStatus.style.color = '#007bff';
        showStatus('Testing PDF parser...', 'success');
        
        // Test PDF.js-based parser
        const testParser = new PDFParser();
        await testParser.init();
        parseStatus.textContent = 'PDF parser initialized successfully! ✅ You can now upload PDF resumes.';
        parseStatus.style.color = '#28a745';
        showStatus('PDF parser test successful! Upload feature ready.', 'success');
        
    } catch (error) {
        console.error('PDF parser test failed:', error);
        parseStatus.textContent = 'PDF parser test failed: ' + error.message;
        parseStatus.style.color = '#dc3545';
        showStatus('PDF parser test failed!', 'error');
    }
}

