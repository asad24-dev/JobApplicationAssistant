# Job Application Assistant Chrome Extension

A modern, AI-powered Chrome extension that helps streamline job applications by scraping profile data and job listings.

## Features

- **Modern UI Design**: Clean, professional interface with gradient backgrounds and smooth animations
- **Profile Management**: Store and manage your professional information
- **LinkedIn Scraping**: Automatically extract profile data from LinkedIn
- **Job Scraping**: Extract job descriptions from various job sites
- **Tabbed Interface**: Organized sections for Profile and Scraping functions

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
- Fill out your personal information
- Add professional details
- Click "Save Profile" to store your data
- Verify data persists after closing/reopening

#### Scrape Tab:
- **LinkedIn Scraping**: Navigate to a LinkedIn profile and click "Scrape LinkedIn Profile"
- **Job Scraping**: Go to any job listing page and click "Scrape Current Page"

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
├── popup.js              # Popup functionality
├── content.js            # Content script for scraping
├── background.js         # Background service worker
├── styles.css            # Additional styles
├── icon.svg              # SVG icon source
├── generate_icons.html   # Icon generator tool
└── README.md            # This file
```

## Troubleshooting

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