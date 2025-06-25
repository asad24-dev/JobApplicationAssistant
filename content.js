// Basic Job Application Assistant Content Script
class JobAssistant {
    constructor() {
        this.userProfile = null;
        this.jobKeywords = ['job', 'career', 'apply', 'application', 'resume', 'cv'];
        this.jobPortals = ['linkedin.com', 'indeed.com', 'glassdoor.com'];
    }

    init() {
        this.loadProfile();
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
        
        // Check if it's a known job portal
        if (this.jobPortals.some(portal => domain.includes(portal))) {
            return true;
        }
        
        // Check for job-related keywords
        const keywordCount = this.jobKeywords.filter(keyword => 
            pageText.includes(keyword) || url.includes(keyword)
        ).length;
        
        return keywordCount >= 2;
    }

    fillForms() {
        if (!this.userProfile) {
            console.log('No user profile found');
            return;
        }

        const inputs = document.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            this.fillField(input);
        });

        this.addSuggestionButton();
    }

    fillField(input) {
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const type = input.type || '';

        // Skip if field already has value
        if (input.value) return;

        // Name fields
        if (name.includes('name') || id.includes('name') || placeholder.includes('name')) {
            if (this.userProfile.fullName) {
                input.value = this.userProfile.fullName;
                this.triggerChange(input);
            }
        }

        // Email fields
        if (type === 'email' || name.includes('email') || id.includes('email')) {
            if (this.userProfile.email) {
                input.value = this.userProfile.email;
                this.triggerChange(input);
            }
        }

        // Phone fields
        if (type === 'tel' || name.includes('phone') || id.includes('phone')) {
            if (this.userProfile.phone) {
                input.value = this.userProfile.phone;
                this.triggerChange(input);
            }
        }

        // Location fields
        if (name.includes('location') || id.includes('location') || name.includes('city')) {
            if (this.userProfile.location) {
                input.value = this.userProfile.location;
                this.triggerChange(input);
            }
        }
    }

    triggerChange(input) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    addSuggestionButton() {
        const button = document.createElement('button');
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
}

// Initialize the assistant
const assistant = new JobAssistant();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        assistant.init();
    });
} else {
    assistant.init();
}