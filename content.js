// content_script.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SCRAPE_LINKEDIN_JOB") {
        // Selector for the main job description text container
        const jobDescription = document.querySelector('.jobs-description__content .jobs-box__html-content')?.innerText ||
                               document.querySelector('.jobs-description-content__text')?.innerText;
        sendResponse({ jobDescription: jobDescription || null });
    }

    if (request.action === "SCRAPE_LINKEDIN_PROFILE") {
        const profileData = scrapeCurrentProfile();
        sendResponse({ profileData: profileData });
    }
    
    // Return true to enable asynchronous response
    return true; 
});


function scrapeCurrentProfile() {
    /**
     * IMPORTANT NOTE: LinkedIn frequently changes its website's HTML structure and class names.
     * These selectors are examples and are likely to break over time. You will need to
     * inspect the page and update them periodically for the scraper to continue working.
     */
    const getText = (selector) => document.querySelector(selector)?.innerText.trim() || '';

    const getCleanTextFromList = (selector) => {
       return Array.from(document.querySelectorAll(selector))
                   .map(el => el.innerText.replace(/see more|see less/gi, '').trim()) // Clean up common text
                   .filter(text => text) // Remove empty entries
                   .join('\n\n'); // Join with double newline for readability
    };

    const profile = {
        fullName: getText('h1'),
        location: getText('.pv-text-details__left-panel:last-child > span.text-body-small'),
        summary: getText('section.pv-about-section > div, #about ~ .pvs-list__outer-container .display-flex span[aria-hidden="true"]'),
        
        // Experience section (targets the newer list-based layout)
        experience: getCleanTextFromList('#experience ~ .pvs-list__outer-container .pvs-entity--with-path'),

        // Education section
        education: getCleanTextFromList('#education ~ .pvs-list__outer-container .pvs-entity--with-path'),

        // Skills section
        skills: Array.from(document.querySelectorAll('#skills ~ .pvs-list__outer-container .pvs-entity--with-path .t-bold span[aria-hidden="true"]')).map(el => el.innerText).join(', '),
        
        linkedinUrl: window.location.href,
    };

    return profile;
}
