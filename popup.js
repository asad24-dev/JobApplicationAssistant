document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveProfile');
    
    // Load existing profile data
    loadProfile();
    
    // Save profile button
    saveButton.addEventListener('click', saveProfile);
});

function loadProfile() {
    chrome.storage.local.get(['userProfile'], (result) => {
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
        showStatus('Profile saved successfully!', 'success');
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