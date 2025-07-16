// Prevent multiple instances
if (window.jobAssistantLoaded) {
    console.log('Job Assistant already loaded, skipping...');
} else {
    window.jobAssistantLoaded = true;
    console.log('Loading Job Assistant...');

    // Job Assistant functionality
    const JobAssistant = {
        userProfile: {},
        jobKeywords: ['job', 'career', 'apply', 'application', 'resume', 'cv'],
        jobPortals: ['linkedin.com', 'indeed.com', 'glassdoor.com', 'greenhouse.io', 'lever.co', 'myworkdayjobs.com'],

        async init() {
            await this.loadProfile();
            this.setupMessageListener();

            if (this.isJobPortal()) {
                console.log('Job portal detected - activating assistant');
            }
        },

        async scrapeLinkedInProfile() {
            const profile = {};
            
            // Scroll through page to load all sections
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(resolve => setTimeout(resolve, 4000)); // wait for lazy loading

            // Full Name - try multiple selectors
            // Name scraping with fallback to <h1>
            const nameEl = document.querySelector('main h1');
            if (nameEl && nameEl.innerText.trim()) {
                profile.fullName = nameEl.innerText.trim();
                console.log('Found name:', profile.fullName);
            } else {
                console.log('Name element not found');
            }


            // Location - try multiple selectors
            const locationSelectors = [
                'span.text-body-small.inline.t-black--light.break-words',
                '.pv-text-details__left-panel .text-body-small',
                '[data-anonymize="location"]'
            ];
            
            for (const selector of locationSelectors) {
                const locationEl = document.querySelector(selector);
                if (locationEl && locationEl.innerText.trim()) {
                    profile.location = locationEl.innerText.trim();
                    console.log('Found location with selector:', selector, '-> Value:', profile.location);
                    break;
                }
            }

            // About (Summary) - try multiple approaches
            const aboutSpan = document.querySelector('div.inline-show-more-text--is-collapsed .visually-hidden');

            if (aboutSpan && aboutSpan.innerText.trim()) {
                profile.summary = aboutSpan.innerText.trim();
                console.log('Extracted About Summary:', profile.summary.substring(0, 500) + '...');
            } else {
                console.log('Could not find the About summary text');
            }


            const contactInfoBtn = document.querySelector('a[href*="overlay/contact-info"]');
            if (contactInfoBtn) {
                contactInfoBtn.click();
                console.log("Clicked contact info");
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 5s

                const emailEl = document.querySelector('a[href^="mailto:"]'); // dedupe

                if (emailEl) {
                    profile.email = emailEl.innerText.trim();
                    console.log("Found email:", profile.email);
                }
            } else {
                console.log("Contact info button not found");
            }
            // Helper to scrape sections based on the h2 title
            const scrapeSectionByTitle = (title) => {
                console.log(`Attempting to scrape section: ${title}`);
                
                // Method 1: Find by h2 text content
                let heading = Array.from(document.querySelectorAll('h2')).find(h2 => 
                    h2.innerText.toLowerCase().includes(title.toLowerCase())
                );
                
                // Method 2: Find by section id containing the title
                if (!heading) {
                    const section = document.querySelector(`section[id*="${title}"]`);
                    if (section) {
                        heading = section.querySelector('h2');
                    }
                }
                
                // Method 3: Find by data-section attribute
                if (!heading) {
                    const section = document.querySelector(`section[data-section*="${title}"]`);
                    if (section) {
                        heading = section.querySelector('h2');
                    }
                }
                
                let section = null;
                if (heading) {
                    section = heading.closest('section');
                }
                
                if (section) {
                    const items = section.querySelectorAll('li.artdeco-list__item, .pvs-entity, .pv-entity__summary-info');
                    const content = Array.from(items).map(item => item.innerText.trim()).join('\n\n');
                    console.log(`Found ${items.length} items for ${title} section`);
                    return content;
                }
                
                console.log(`No section found for: ${title}`);
                return '';
            };
            

            profile.experience = scrapeSectionByTitle('experience');
            profile.education = scrapeSectionByTitle('education');
            profile.projects = scrapeSectionByTitle('Projects');

            // Skills
            const skillsBtn = document.querySelector('a[href*="skills"]');
            if (skillsBtn) {
                skillsBtn.click();
                console.log("Clicked skills button");


                // Wait for modal and skills to load
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s

                const allSpans = Array.from(document.querySelectorAll('.pvs-list__paged-list-item span[aria-hidden="true"]'));
                const skillNames = allSpans
                    .filter((_, index) => index % 2 === 0)
                    .map(el => el.innerText.trim())
                    .filter((text, index, arr) => text.length > 0 && arr.indexOf(text) === index); // dedupe

                profile.skills = skillNames.join(', ');
                console.log('Found skills:', profile.skills);
            } else {
                profile.skills = scrapeSectionByTitle('Skills'); // fallback
            }



            // For popup compatibility, extract degree/university from the first education entry
            if (profile.education) {
                const educationLines = profile.education.split('\n').filter(line => line.trim() !== '');
                
                // Find first education block
                let firstUni = '';
                let firstDegree = '';
                for (let i = 0; i < educationLines.length - 1; i++) {
                    const line = educationLines[i].trim();
                    const nextLine = educationLines[i + 1].trim();

                    if (
                    line.match(/university|college|school|/i) &&
                    nextLine.match(/bachelor|bachelors|masters|msc|meng|a levels|degree/i)
                    ) {
                    firstUni = line;
                    firstDegree = nextLine;
                    break;
                    }
                }

                if (!firstUni && educationLines.length > 0) {
                    firstUni = educationLines[0];
                }

                profile.university = firstUni;
                profile.degree = firstDegree;
            }


            // Ensure all fields are defined to avoid undefined values in the popup
            const fields = ['fullName', 'email', 'phone', 'location', 'summary', 'experience', 'skills', 'degree', 'university', 'projects', 'education'];
            fields.forEach(field => {
                profile[field] = profile[field] || '';
            });

            console.log('LinkedIn profile scraped:', profile);
            
            // Debug: log each field that was scraped
            console.log('Scraped fields:', {
                fullName: profile.fullName,
                location: profile.location,
                summary: profile.summary,
                experience: profile.experience,
                education: profile.education,
                skills: profile.skills,
                projects: profile.projects,
                degree: profile.degree,
                university: profile.university
            });
            
            return profile;
        },

        loadProfile() {
            return new Promise(resolve => {
                chrome.storage.local.get(['userProfile'], (result) => {
                    this.userProfile = result.userProfile || {};
                    console.log('Profile loaded:', this.userProfile);
                    resolve();
                });
            });
        },

        isJobPortal() {
            const url = window.location.href.toLowerCase();
            const domain = window.location.hostname.toLowerCase();
            const pageText = document.body.innerText.toLowerCase();

            if (this.jobPortals.some(portal => domain.includes(portal))) return true;

            const keywordCount = this.jobKeywords.filter(k =>
                pageText.includes(k) || url.includes(k)
            ).length;

            return keywordCount >= 2;
        },


        // Message listener for scraping job description and LinkedIn profiles
        setupMessageListener() {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === "SCRAPE_JOB") {
                    let jobText = this.scrapeJobDescription();
                    sendResponse({ text: jobText || "No job description found on this site." });
                    return true;
                }
                
                if (request.action === "SCRAPE_LINKEDIN_PROFILE") {
                    this.scrapeLinkedInProfile()
                        .then(profile => {
                            sendResponse({ profile: profile || {}, error: null });
                        })
                        .catch(error => {
                            sendResponse({ profile: {}, error: error.message || "Scraping failed." });
                        });
                    return true; 
                }

                if (request.action === "SCRAPE_QUESTIONS") {
                    let questions = this.scrapeApplicationQuestions();
                    sendResponse({ questions: questions || "No application questions found on this site." });
                    return true;
                }

            });
        },

        // Job Description Scraper (Platform-specific + generic fallback)
        scrapeJobDescription() {
            const host = window.location.hostname;
            let jobText = "";

            if (host.includes("linkedin.com")) {
                const el = document.querySelector(".description__text, .show-more-less-html__markup, .jobs-description__container, .jobs-description__content.jobs-description-content");
                jobText = el?.innerText?.trim();
            }
            else if (host.includes("greenhouse.io")) {
                const el = document.querySelector(".content, .section-wrapper, .description, .job__description.body");
                jobText = el?.innerText?.trim();
            }
            else if (host.includes("lever.co")) {
                const el = document.querySelector("div.content, div.description");
                jobText = el?.innerText?.trim();
            }
            else if (host.includes("myworkdayjobs.com")) {
                const el = document.querySelector("[data-automation-id='jobPostingDescription']");
                jobText = el?.innerText?.trim();
            }

            // Generic fallback
            if (!jobText || jobText.length < 100) {
                const selectors = [
                    ".job-description", ".job-details-body", ".description", ".job-desc",
                    "[id*='description']", "[class*='description']",
                    "section", "article"
                ];
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el && el.innerText.length > 100) {
                        jobText = el.innerText.trim();
                        break;
                    }
                }
            }

            return jobText || "No job description found on this site.";
        },

        // Application Questions Scraper (Platform-specific + generic fallback)
        scrapeApplicationQuestions() {
            const host = window.location.hostname;
            let questionsText = "";

            if (host.includes("linkedin.com")) {
                // LinkedIn application questions
                const questionElements = document.querySelectorAll(
                    '.jobs-easy-apply-form-section__grouping label, ' +
                    '.fb-form-element label, ' +
                    '.artdeco-text-input--label, ' +
                    '.jobs-easy-apply-form-element label'
                );
                
                if (questionElements.length > 0) {
                    const questions = Array.from(questionElements)
                        .map(el => el.innerText.trim())
                        .filter(text => text.length > 3 && !text.includes('*'))
                        .filter(text => 
                            text.toLowerCase().includes('why') ||
                            text.toLowerCase().includes('experience') ||
                            text.toLowerCase().includes('tell') ||
                            text.toLowerCase().includes('describe') ||
                            text.toLowerCase().includes('explain') ||
                            text.toLowerCase().includes('what') ||
                            text.toLowerCase().includes('how') ||
                            text.toLowerCase().includes('cover letter') ||
                            text.toLowerCase().includes('additional information')
                        );
                    questionsText = questions.join('\n\n');
                }
            }
            else if (host.includes("greenhouse.io")) {
                // Greenhouse application questions
                const questionElements = document.querySelectorAll(
                    'label, .field-label, .application-question, .question-text'
                );
                
                if (questionElements.length > 0) {
                    const questions = Array.from(questionElements)
                        .map(el => el.innerText.trim())
                        .filter(text => text.length > 10)
                        .filter(text => 
                            text.includes('?') ||
                            text.toLowerCase().includes('why') ||
                            text.toLowerCase().includes('tell') ||
                            text.toLowerCase().includes('describe') ||
                            text.toLowerCase().includes('cover letter')
                        );
                    questionsText = questions.join('\n\n');
                }
            }
            else if (host.includes("lever.co")) {
                // Lever application questions
                const questionElements = document.querySelectorAll(
                    '.application-form label, .form-field label, .question'
                );
                
                if (questionElements.length > 0) {
                    const questions = Array.from(questionElements)
                        .map(el => el.innerText.trim())
                        .filter(text => text.length > 10)
                        .filter(text => 
                            text.includes('?') ||
                            text.toLowerCase().includes('why') ||
                            text.toLowerCase().includes('tell') ||
                            text.toLowerCase().includes('describe')
                        );
                    questionsText = questions.join('\n\n');
                }
            }
            else if (host.includes("myworkdayjobs.com")) {
                // Workday application questions
                const questionElements = document.querySelectorAll(
                    '[data-automation-id*="question"], .WDAY-FORM-LABEL, label'
                );
                
                if (questionElements.length > 0) {
                    const questions = Array.from(questionElements)
                        .map(el => el.innerText.trim())
                        .filter(text => text.length > 10)
                        .filter(text => 
                            text.includes('?') ||
                            text.toLowerCase().includes('why') ||
                            text.toLowerCase().includes('tell') ||
                            text.toLowerCase().includes('describe') ||
                            text.toLowerCase().includes('cover letter')
                        );
                    questionsText = questions.join('\n\n');
                }
            }

            // Enhanced fallback for Google Forms, Microsoft Forms, Typeform, and other form builders
            if (!questionsText || questionsText.length < 50) {
                const formBuilderSelectors = [
                    // Google Forms
                    '.freebirdFormviewerViewNumberedItemContainer .freebirdFormviewerViewItemsItemItemTitle',
                    '.freebirdFormviewerViewItemsItemItemTitle',
                    '.freebirdFormviewerComponentsQuestionBaseTitle',
                    '[data-params*="question"]',
                    '.exportFormQuestion',
                    '.freebirdFormviewerViewItemsTextItemTitle',
                    
                    // Microsoft Forms
                    '.question-title-box .question-title',
                    '.office-form-question-title',
                    '[data-automation-id="questionTitle"]',
                    '.form-question-title',
                    '.question-title-container',
                    '.office-form-question-body .question-title',
                    
                    // Typeform
                    '.typeform-question-title',
                    '[data-qa="question-title"]',
                    '.question-group h1',
                    '.question-group .question-title',
                    
                    // JotForm
                    '.form-label',
                    '.form-label-top',
                    '.form-label-left',
                    '.form-label-right',
                    '.jf-label',
                    
                    // Formstack
                    '.fsLabel',
                    '.fsSection .fsLabel',
                    
                    // Wufoo
                    '.field label',
                    '.wufoo label',
                    
                    // Gravity Forms
                    '.gfield_label',
                    '.ginput_container label',
                    
                    // Generic form selectors (comprehensive)
                    'form label',
                    '.question',
                    '.question-text',
                    '.question-title',
                    '.application-question',
                    '[class*="question"]',
                    '[id*="question"]',
                    'textarea + label',
                    'input[type="text"] + label',
                    'input[type="email"] + label',
                    '.form-group label',
                    '.form-field label',
                    '.field label',
                    '.input-group label',
                    '.form-control + label',
                    '.form-item label',
                    '.control-label',
                    '.col-form-label',
                    '.form-label',
                    '.field-label',
                    '.input-label',
                    
                    // Additional patterns for various form frameworks
                    '.mat-form-field label', // Angular Material
                    '.v-label', // Vuetify
                    '.ant-form-item-label', // Ant Design
                    '.form-floating label', // Bootstrap
                    '.mdc-floating-label', // Material Design Components
                    
                    // Aria and accessibility selectors
                    '[aria-label]',
                    '[aria-labelledby]',
                    'legend',
                    'fieldset legend',
                    
                    // Title and heading elements that might contain questions
                    'h1, h2, h3, h4, h5, h6',
                    '.title',
                    '.heading',
                    '.section-title'
                ];
                
                for (const selector of formBuilderSelectors) {
                    try {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            const questions = Array.from(elements)
                                .map(el => {
                                    // Get text from aria-label if available, otherwise innerText
                                    return el.getAttribute('aria-label') || el.innerText.trim();
                                })
                                .filter(text => text && text.length > 3)
                                .filter(text => {
                                    const lowerText = text.toLowerCase();
                                    return (
                                        // Question indicators
                                        text.includes('?') ||
                                        lowerText.includes('why') ||
                                        lowerText.includes('tell') ||
                                        lowerText.includes('describe') ||
                                        lowerText.includes('explain') ||
                                        lowerText.includes('what') ||
                                        lowerText.includes('how') ||
                                        lowerText.includes('when') ||
                                        lowerText.includes('where') ||
                                        lowerText.includes('which') ||
                                        lowerText.includes('cover letter') ||
                                        lowerText.includes('additional information') ||
                                        lowerText.includes('experience') ||
                                        lowerText.includes('background') ||
                                        lowerText.includes('qualification') ||
                                        lowerText.includes('skill') ||
                                        lowerText.includes('interest') ||
                                        lowerText.includes('motivation') ||
                                        lowerText.includes('reason') ||
                                        lowerText.includes('goal') ||
                                        lowerText.includes('expectation') ||
                                        lowerText.includes('salary') ||
                                        lowerText.includes('availability') ||
                                        lowerText.includes('start date') ||
                                        lowerText.includes('portfolio') ||
                                        lowerText.includes('github') ||
                                        lowerText.includes('linkedin') ||
                                        lowerText.includes('reference') ||
                                        lowerText.includes('work authorization') ||
                                        lowerText.includes('visa') ||
                                        lowerText.includes('sponsorship') ||
                                        lowerText.includes('remote') ||
                                        lowerText.includes('relocation') ||
                                        lowerText.includes('travel')
                                    );
                                })
                                .filter((text, index, arr) => arr.indexOf(text) === index); // Remove duplicates
                            
                            if (questions.length > 0) {
                                questionsText = questions.join('\n\n');
                                console.log(`Found ${questions.length} questions using selector: ${selector}`);
                                break;
                            }
                        }
                    } catch (error) {
                        console.log(`Error with selector ${selector}:`, error);
                        continue;
                    }
                }
                
                // If still no questions found, try a more aggressive approach
                if (!questionsText || questionsText.length < 20) {
                    console.log('Trying aggressive question detection...');
                    const allTextElements = document.querySelectorAll('*');
                    const potentialQuestions = Array.from(allTextElements)
                        .map(el => el.innerText || el.textContent || '')
                        .filter(text => text.trim().length > 10 && text.trim().length < 500)
                        .filter(text => {
                            const lowerText = text.toLowerCase();
                            return (
                                text.includes('?') ||
                                (lowerText.includes('why') && (lowerText.includes('you') || lowerText.includes('company'))) ||
                                (lowerText.includes('tell') && lowerText.includes('about')) ||
                                (lowerText.includes('describe') && lowerText.includes('your')) ||
                                lowerText.includes('cover letter')
                            );
                        })
                        .filter((text, index, arr) => arr.indexOf(text) === index)
                        .slice(0, 10); // Limit to first 10 matches
                    
                    if (potentialQuestions.length > 0) {
                        questionsText = potentialQuestions.join('\n\n');
                        console.log(`Found ${potentialQuestions.length} questions using aggressive detection`);
                    }
                }
            }

            return questionsText || "No application questions found on this site.";
        },

        // Debug helper function to test question scraping on current page
        
    };

    // Initialize the assistant
    JobAssistant.init();
}

