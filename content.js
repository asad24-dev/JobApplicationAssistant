// content.js
class JobAssistant {
    constructor() {
        this.userProfile = null;
        this.jobKeywords = ['job', 'career', 'apply', 'application', 'resume', 'cv'];
        this.jobPortals = [
            'linkedin.com', 'indeed.com', 'glassdoor.com', 'greenhouse.io', 'lever.co', 'myworkdayjobs.com'
        ];
    }

    init() {
        this.loadProfile();
        this.setupMessageListener();
        if (this.isJobPortal()) {
            console.log('Job portal detected - activating assistant');
            setTimeout(() => this.fillForms(), 2000);
        }
    }

    loadProfile() {
        chrome.storage.local.get(['userProfile'], (result) => {
            this.userProfile = result.userProfile;
        });
    }

    isJobPortal() {
        const url = window.location.href.toLowerCase();
        const domain = window.location.hostname.toLowerCase();
        const pageText = document.body.innerText.toLowerCase();

        if (this.jobPortals.some(portal => domain.includes(portal))) return true;

        const keywordCount = this.jobKeywords.filter(k =>
            pageText.includes(k) || url.includes(k)
        ).length;

        return keywordCount >= 2;
    }

    fillForms() {
        if (!this.userProfile) {
            console.log('No user profile found');
            return;
        }

        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => this.fillField(input));
        this.addSuggestionButton();
    }

    fillField(input) {
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const type = input.type || '';

        if (input.value) return;

        if (name.includes('name') || id.includes('name') || placeholder.includes('name')) {
            if (this.userProfile.fullName) input.value = this.userProfile.fullName;
        } else if (type === 'email' || name.includes('email') || id.includes('email')) {
            if (this.userProfile.email) input.value = this.userProfile.email;
        } else if (type === 'tel' || name.includes('phone') || id.includes('phone')) {
            if (this.userProfile.phone) input.value = this.userProfile.phone;
        } else if (name.includes('location') || id.includes('location') || name.includes('city')) {
            if (this.userProfile.location) input.value = this.userProfile.location;
        } else if (name.includes('linkedin') || id.includes('linkedin')) {
            if (this.userProfile.linkedinUrl) input.value = this.userProfile.linkedinUrl;
        }

        this.triggerChange(input);
    }

    triggerChange(input) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    addSuggestionButton() {
        if (document.getElementById("job-assistant-btn")) return;

        const button = document.createElement('button');
        button.id = "job-assistant-btn";
        button.textContent = '🤖 AI Assistant';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 10px 15px;
            background: #007BFF;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;

        button.addEventListener('click', () => {
            this.showSuggestions();
        });

        document.body.appendChild(button);
    }

    showSuggestions() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
        `;

        content.innerHTML = `
            <h3>Job Application Assistant</h3>
            <p>Your profile has been loaded and forms are being filled automatically.</p>
            <p><strong>Skills:</strong> ${this.userProfile?.skills || 'Not set'}</p>
            <p><strong>Experience:</strong> ${this.userProfile?.experience?.substring(0, 100) || 'Not set'}...</p>
            <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 15px; padding: 8px 15px; background: #007BFF; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "SCRAPE_LINKEDIN_JOB") {
                const el = document.querySelector(".description__text, .show-more-less-html__markup");
                const jobText = el?.innerText?.trim();
                sendResponse({ text: jobText || "Job description not found." });
                return true;
            }

            if (request.action === "SCRAPE_LINKEDIN_PROFILE") {
                let profileText = "";
                const sections = document.querySelectorAll('section');
                sections.forEach(section => {
                    if (section.innerText && section.innerText.length > 200) {
                        profileText += section.innerText + '\n\n';
                    }
                });
                sendResponse({ text: profileText.trim() || "LinkedIn profile content not found." });
                return true;
            }
        });
    }
}

const assistant = new JobAssistant();
document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', () => assistant.init())
    : assistant.init();
