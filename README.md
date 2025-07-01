# Job Application Assistant Chrome Extension

A modern, AI-powered Chrome extension that helps streamline job applications by automatically extracting profile data from LinkedIn profiles and PDF resumes, then intelligently filling job application forms.

## Features

- **Modern UI Design**: Clean, professional interface with gradient backgrounds and smooth animations
- **Profile Management**: Store and manage your professional information
- **LinkedIn Scraping**: Automatically extract profile data from LinkedIn profiles
- **PDF Resume Parsing**: Upload and parse PDF resumes to extract profile information
- **Smart Form Filling**: Automatically detect and fill job application forms
- **Cross-Platform Support**: Works on LinkedIn, Indeed, Glassdoor, and other job sites

## Installation & Testing

### 1. Load the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `JobApplicationAssistant` folder
4. The extension should appear with the new icon

### 2. Generate Icons (Optional)
If you want to use the custom icons:
1. Open `generate_icons.html` in a browser
2. Right-click each generated icon and save as:
   - `icon16.png` (16x16)
   - `icon32.png` (32x32) 
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)
3. Place these files in the extension directory

### 3. Test the Extension

#### Profile Tab:
- Fill out your personal information manually
- Add professional details
- Click "Save Profile" to store your data
- Verify data persists after closing/reopening

#### LinkedIn Scraping:
- Navigate to your LinkedIn profile page
- Click the extension icon and select "Scrape LinkedIn"
- Profile data will be automatically extracted and saved

#### PDF Resume Upload:
- Click the extension icon from any webpage
- In the "Upload Resume" section, click "Choose File"
- Select your PDF resume file
- Click "Parse Resume" to extract profile information
- Data will be automatically saved to your profile

#### Form Filling:
- Navigate to any job application website
- Click the extension icon and select "Fill Form"
- Form fields will be automatically populated with your saved profile data
- Use "Suggest Answer" buttons for intelligent field completion

#### Visual Improvements:
- Modern gradient background
- Professional color scheme
- Smooth hover animations
- Better form layout with labels
- Tabbed interface for organization
- Custom logo in header

## Supported Sites
- LinkedIn (profiles and job listings)
- Indeed (job listings)
- Glassdoor (job listings)

## File Structure
```
JobApplicationAssistant/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.js              # Popup functionality and PDF handling
├── content.js            # Content script for scraping and form filling
├── background.js         # Background service worker
├── pdf-parser.js         # PDF parsing utility using PDF.js
├── styles.css            # Additional styles
├── icon.svg              # SVG icon source
├── generate_icons.html   # Icon generator tool
└── README.md            # This file
```

## Technical Details

### PDF Resume Parsing
- Uses PDF.js library for reliable text extraction
- Supports various resume formats and layouts
- Extracts: name, email, phone, location, summary, experience, skills, education, degree, university, projects
- Client-side processing for privacy

### LinkedIn Profile Scraping
- Extracts comprehensive profile information
- Works with LinkedIn's current structure
- Respects platform guidelines

### Smart Form Filling
- Automatically detects common form field types
- Uses intelligent matching algorithms
- Provides suggestion buttons for enhanced fields
- Works across multiple job sites

### Permissions Required
- `storage` - Save profile data locally
- `activeTab` - Access current tab for form filling
- `scripting` - Inject content scripts
- `tabs` - Tab management
- Host permissions for LinkedIn, Indeed, Glassdoor, and CDN access

## Troubleshooting

### PDF Upload Issues
- Ensure the file is a valid PDF format
- Check that the PDF contains selectable text (not scanned images)
- Try refreshing the page if parsing fails
- Verify file size is reasonable (under 10MB recommended)

### LinkedIn Scraping Issues
- Make sure you're on your LinkedIn profile page
- Ensure you're logged into LinkedIn
- Check that your profile is complete and visible

### Form Filling Issues
- The extension works best with standard HTML form fields
- Some custom form implementations may not be supported
- Try refreshing the page if forms aren't detected
- Check browser console for any error messages

### General Issues
- If the extension doesn't load, check the console for errors
- Make sure all files are in the correct directory
- Verify the manifest.json syntax is valid
- Check that permissions are properly configured

## Development

The extension uses:
- Manifest V3
- Modern CSS with gradients and animations
- Tabbed interface for better UX
- Chrome Storage API for data persistence
- Content scripts for web scraping 