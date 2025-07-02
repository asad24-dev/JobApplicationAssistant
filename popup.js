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
    // Helper function to safely get element by ID
    const safeGetElement = (id) => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
        }
        return element;
    };

    const saveButton = safeGetElement('saveProfile');
    const saveJobButton = safeGetElement('saveJob');
    const scrapeButton = safeGetElement('scrapeJob');
    const scrapeLinkedInButton = safeGetElement('scrapeLinkedIn');
    const scrapeQuestionsButton = safeGetElement('scrapeQuestions');
    const saveQuestionsButton = safeGetElement('saveQuestions');
    const generateContentButton = safeGetElement('generateContent');
    const copyContentButton = safeGetElement('copyContent');
    const parseResumeButton = safeGetElement('parseResume');
    const resumeFileInput = safeGetElement('resumePdf');

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
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // File input change handler
    if (resumeFileInput) {
        resumeFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const parseButton = safeGetElement('parseResume');
            const parseStatus = safeGetElement('parseStatus');
            
            if (file) {
                if (file.type !== 'application/pdf') {
                    if (parseStatus) {
                        parseStatus.textContent = 'Please select a PDF file.';
                        parseStatus.style.color = '#dc3545';
                    }
                    if (parseButton) parseButton.disabled = true;
                    return;
                }
                
                if (parseStatus) {
                    parseStatus.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
                    parseStatus.style.color = '#28a745';
                }
                if (parseButton) parseButton.disabled = false;
            } else {
                if (parseStatus) parseStatus.textContent = '';
                if (parseButton) parseButton.disabled = true;
            }
        });
    }

    // Load initial data
    loadProfile();
    loadJob();
    loadQuestions();

    // Add event listeners safely
    if (saveButton) saveButton.addEventListener('click', saveProfile);
    if (saveJobButton) saveJobButton.addEventListener('click', saveJob);
    if (scrapeButton) scrapeButton.addEventListener('click', scrapeJob);
    if (scrapeLinkedInButton) scrapeLinkedInButton.addEventListener('click', scrapeLinkedInProfile);
    if (scrapeQuestionsButton) scrapeQuestionsButton.addEventListener('click', scrapeQuestions);
    if (saveQuestionsButton) saveQuestionsButton.addEventListener('click', saveQuestions);
    if (generateContentButton) generateContentButton.addEventListener('click', generateContent);
    if (copyContentButton) copyContentButton.addEventListener('click', copyToClipboard);
    if (parseResumeButton) parseResumeButton.addEventListener('click', parseResume);

    // Add test button event listener
    const testPdfJsButton = safeGetElement('testPdfJs');
    if (testPdfJsButton) {
        testPdfJsButton.addEventListener('click', testPdfJsLibrary);
    }

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
            
            // Helper function to safely set element value
            const setElementValue = (id, value) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value || '';
                } else {
                    console.warn(`Element with id '${id}' not found`);
                }
            };
            
            setElementValue('fullName', profile.fullName);
            setElementValue('email', profile.email);
            setElementValue('phone', profile.phone);
            setElementValue('location', profile.location);
            setElementValue('linkedinUrl', profile.linkedinUrl);
            setElementValue('summary', profile.summary);
            setElementValue('projects', profile.projects);
            setElementValue('experience', profile.experience);
            setElementValue('skills', profile.skills);
            setElementValue('degree', profile.degree);
            setElementValue('university', profile.university);
            
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
function loadJob() {
    chrome.storage.local.get(['scrapedJob'], (result) => {
        console.log('Loading job description from storage:', result.scrapedJob);
        if (result.scrapedJob) {
            const jobData = document.getElementById('scrapedJobData');
            jobData.textContent = result.scrapedJob;
        } else {
            console.log('No job description found in storage');
            document.getElementById('scrapedJobData').textContent = 'No job description scraped yet.';
        }
    });
}
function saveProfile() {
    // Helper function to safely get element value
    const getElementValue = (id) => {
        const element = document.getElementById(id);
        if (element) {
            return element.value;
        } else {
            console.warn(`Element with id '${id}' not found`);
            return '';
        }
    };

    const profile = {
        fullName: getElementValue('fullName'),
        email: getElementValue('email'),
        phone: getElementValue('phone'),
        location: getElementValue('location'),
        linkedinUrl: getElementValue('linkedinUrl'),
        summary: getElementValue('summary'),
        projects: getElementValue('projects'),
        experience: getElementValue('experience'),
        degree: getElementValue('degree'),
        university: getElementValue('university'),
        skills: getElementValue('skills'),
        lastUpdated: new Date().toISOString()
    };

    if (!profile.fullName || !profile.email) {
        showStatus('Please fill in at least Name and Email.', 'error');
        return;
    }

    chrome.storage.local.set({ userProfile: profile }, () => {
        console.log('Profile saved');
        showStatus('Profile saved successfully!', 'success');
    });
}

function scrapeLinkedInProfile() {
    const linkedinUrlElement = document.getElementById('linkedinUrl');
    if (!linkedinUrlElement) {
        showStatus('LinkedIn URL input field not found.', 'error');
        return;
    }
    
    let linkedinUrl = linkedinUrlElement.value.trim();
    
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
                            
                            // Helper function to safely set element value
                            const setElementValue = (id, value) => {
                                const element = document.getElementById(id);
                                if (element) {
                                    element.value = value || '';
                                }
                            };
                            
                            setElementValue('fullName', response.profile.fullName);
                            setElementValue('email', response.profile.email);
                            setElementValue('phone', response.profile.phone);
                            setElementValue('location', response.profile.location);
                            setElementValue('summary', response.profile.summary);
                            setElementValue('projects', response.profile.projects);
                            setElementValue('experience', response.profile.experience);
                            setElementValue('skills', response.profile.skills);
                            setElementValue('degree', response.profile.degree);
                            setElementValue('university', response.profile.university);

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
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    setTimeout(() => {
        status.style.display = 'none';
        status.textContent = '';
    }, 4000);
}

function scrapeJob() {
    showStatus('Scraping job description...', 'success');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "SCRAPE_JOB" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Chrome runtime error:', chrome.runtime.lastError);
                    document.getElementById('scrapedJobData').textContent = 'Error: Unable to scrape this page. Please refresh the page and try again.';
                    showStatus('Error: Unable to scrape current page. Try refreshing the page.', 'error');
                    return;
                }
                
                if (response && response.text) {
                    document.getElementById('scrapedJobData').textContent = response.text;
                    showStatus('Job description scraped successfully!', 'success');
                } else {
                    document.getElementById('scrapedJobData').textContent = 'No job description content detected on current page.';
                    showStatus('No job content found on current page.', 'error');
                }
            });
        } else {
            showStatus('Error: No active tab found.', 'error');
        }
    });
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

// Questions scraping functionality
function scrapeQuestions() {
    let questionsUrl = document.getElementById('questionsUrl').value.trim();
    
    if (questionsUrl) {
        // Prepend https:// if missing
        if (!questionsUrl.startsWith('http://') && !questionsUrl.startsWith('https://')) {
            questionsUrl = 'https://' + questionsUrl;
        }
        
        showStatus('Scraping application questions...', 'success');
        
        // Create a new tab with the questions URL
        chrome.tabs.create({ url: questionsUrl, active: false }, (tab) => {
            // Wait for the page to load, then scrape
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    // Remove the listener to avoid multiple calls
                    chrome.tabs.onUpdated.removeListener(listener);
                    
                    // Give the page a moment to fully render
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tab.id, { action: "SCRAPE_QUESTIONS" }, (response) => {
                            if (chrome.runtime.lastError) {
                                document.getElementById('scrapedQuestionsData').textContent = 'Error: Unable to scrape questions from this page.';
                                showStatus('Error: Unable to scrape application questions.', 'error');
                                chrome.tabs.remove(tab.id);
                                return;
                            }
                            if (response && response.questions) {
                                document.getElementById('scrapedQuestionsData').textContent = response.questions;
                                showStatus('Application questions scraped successfully!', 'success');
                            } else {
                                document.getElementById('scrapedQuestionsData').textContent = 'No application questions detected.';
                                showStatus('No questions found on this page.', 'error');
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
            chrome.tabs.sendMessage(tabs[0].id, { action: "SCRAPE_QUESTIONS" }, (response) => {
                if (chrome.runtime.lastError) {
                    document.getElementById('scrapedQuestionsData').textContent = 'Error: Unable to scrape questions from this page.';
                    showStatus('Error: Unable to scrape current page.', 'error');
                    return;
                }
                if (response && response.questions) {
                    document.getElementById('scrapedQuestionsData').textContent = response.questions;
                    showStatus('Application questions scraped successfully!', 'success');
                } else {
                    document.getElementById('scrapedQuestionsData').textContent = 'No application questions detected on current page.';
                    showStatus('No questions found on current page.', 'error');
                }
            });
        });
    }
}

function saveQuestions() {
    const questions = document.getElementById('scrapedQuestionsData').textContent.trim();
    
    if (!questions || questions === 'Scraped application questions will appear here...') {
        showStatus('No questions to save. Please scrape questions first.', 'error');
        return;
    }
    
    // Save the questions to storage
    chrome.storage.local.set({ scrapedQuestions: questions }, () => {
        console.log('Questions saved:', questions);
        showStatus('Application questions saved successfully!', 'success');
    });
}





function loadQuestions() {
    chrome.storage.local.get(['scrapedQuestions'], (result) => {
        console.log('Loading questions from storage:', result.scrapedQuestions);
        if (result.scrapedQuestions) {
            const questionsData = document.getElementById('scrapedQuestionsData');
            questionsData.textContent = result.scrapedQuestions;
        }
    });
}

// Backend API communication
const BACKEND_URL = 'http://127.0.0.1:8000';

async function generateContent() {
    const generateButton = document.getElementById('generateContent');
    const generatedContentDiv = document.getElementById('generatedContent');
    const copyButton = document.getElementById('copyContent');
    const statsDiv = document.getElementById('generationStats');
    
    try {
        // Disable button and show loading state
        generateButton.disabled = true;
        generateButton.textContent = '🔄 Generating...';
        showStatus('Generating AI content...', 'success');
        
        // Get form data
        const contentType = document.getElementById('contentType').value;
        
        // Get stored profile and job data
        const profile = await getStoredProfile();
        const jobDescription = await getStoredJobDescription();
        
        if (!profile || !profile.fullName) {
            throw new Error('No profile data found. Please fill in your profile first.');
        }
        
        if (!jobDescription || jobDescription === 'No job description scraped yet.') {
            throw new Error('No job description found. Please scrape a job description first.');
        }
        
        // For questions type, also get stored questions
        let questions = null;
        if (contentType === 'questions') {
            questions = await getStoredQuestions();
            if (!questions || questions === 'Scraped application questions will appear here...') {
                throw new Error('No application questions found. Please scrape questions first from the Questions tab.');
            }
        }
        
        // Prepare request data
        const requestData = {
            user_profile: profile,
            job_description: jobDescription,
            content_type: contentType,
            questions: questions || null
        };
        
        console.log('Sending request to backend:', requestData);
        
        // Make API request
        const response = await fetch(`${BACKEND_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Display generated content
        generatedContentDiv.textContent = result.generated_content;
        copyButton.style.display = 'inline-block';
        
        // Show stats
        const tokenInfo = result.token_usage ? 
            `Tokens used: ${result.token_usage.total_tokens} | ` : '';
        statsDiv.textContent = `${tokenInfo}Processing time: ${result.processing_time}s | Generated: ${new Date().toLocaleTimeString()}`;
        
        const contentTypeDisplay = contentType === 'cover_letter' ? 'COVER LETTER' : 'QUESTION ANSWERS';
        showStatus(`${contentTypeDisplay} generated successfully!`, 'success');
        
    } catch (error) {
        console.error('Generation error:', error);
        generatedContentDiv.textContent = `Error: ${error.message}`;
        showStatus(`Generation failed: ${error.message}`, 'error');
        copyButton.style.display = 'none';
        statsDiv.textContent = '';
    } finally {
        // Re-enable button
        generateButton.disabled = false;
        generateButton.textContent = '🤖 Generate AI Content';
    }
}

async function copyToClipboard() {
    const generatedContent = document.getElementById('generatedContent').textContent;
    
    try {
        await navigator.clipboard.writeText(generatedContent);
        showStatus('Content copied to clipboard!', 'success');
        
        // Temporarily change button text
        const copyButton = document.getElementById('copyContent');
        const originalText = copyButton.textContent;
        copyButton.textContent = '✅ Copied!';
        setTimeout(() => {
            copyButton.textContent = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('Copy failed:', error);
        showStatus('Failed to copy to clipboard', 'error');
    }
}

function getStoredProfile() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userProfile'], (result) => {
            resolve(result.userProfile || null);
        });
    });
}

function getStoredJobDescription() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['scrapedJob'], (result) => {
            resolve(result.scrapedJob || null);
        });
    });
}

function getStoredQuestions() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['scrapedQuestions'], (result) => {
            resolve(result.scrapedQuestions || null);
        });
    });
}

// Test backend connection
async function testBackendConnection() {
    try {
        const response = await fetch(`${BACKEND_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            console.log('Backend connected:', data);
            return true;
        }
    } catch (error) {
        console.log('Backend not available:', error.message);
        return false;
    }
    return false;
}

// Test backend on load
window.addEventListener('load', async () => {
    const isConnected = await testBackendConnection();
    if (!isConnected) {
        console.warn('Backend server not running. Make sure to start the FastAPI server.');
    }
});



