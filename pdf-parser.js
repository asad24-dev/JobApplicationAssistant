// PDF Parser utility for extracting text from PDF files using local PDF.js
class PDFParser {
    constructor() {
        this.initialized = false;
        this.initPromise = null;
    }

    async init() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this._doInit();
        return this.initPromise;
    }

    async _doInit() {
        try {
            console.log('Initializing PDF Parser with local PDF.js...');
            if (typeof window.pdfjsLib === 'undefined') {
                throw new Error('PDF.js library not loaded');
            }
            const workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
            console.log('PDF.js configured with worker:', workerSrc);
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize PDF parser:', error);
            this.initialized = false;
            this.initPromise = null;
            throw new Error('Failed to initialize PDF parser: ' + error.message);
        }
    }

    async extractTextFromPDF(file) {
        try {
            if (!this.initialized) {
                await this.init();
            }

            console.log('Starting PDF text extraction with PDF.js...');

            const arrayBuffer = await this.fileToArrayBuffer(file);
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            console.log(`PDF loaded. Total pages: ${pdf.numPages}`);
            let fullText = '';

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();

                // **IMPROVED: Smarter text reconstruction**
                // Sort items by vertical, then horizontal position
                textContent.items.sort((a, b) => {
                    if (a.transform[5] < b.transform[5]) return 1;
                    if (a.transform[5] > b.transform[5]) return -1;
                    if (a.transform[4] < b.transform[4]) return -1;
                    if (a.transform[4] > b.transform[4]) return 1;
                    return 0;
                });

                let lastY = -1;
                let pageText = '';
                for (const item of textContent.items) {
                    if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                        pageText += '\n'; // New line for vertical gaps
                    }
                    // Add a space if items are not contiguous but on the same line
                    if (!pageText.endsWith('\n') && pageText.length > 0 && !pageText.endsWith(' ')) {
                         pageText += ' ';
                    }

                    pageText += item.str;
                    lastY = item.transform[5];
                }

                if (pageText.trim()) {
                    fullText += pageText + '\n\n';
                }
                console.log(`Extracted text from page ${pageNum}`);
            }

            console.log(`Total extracted text: ${fullText.length} characters`);
            if (!fullText.trim()) {
                throw new Error('No text content found in PDF. The PDF might be image-based or corrupted.');
            }
            
            // For debugging, it's helpful to see the raw extracted text
            // console.log('=== RAW EXTRACTED TEXT START ===\n', fullText, '\n=== RAW EXTRACTED TEXT END ===');

            return fullText.trim();

        } catch (error) {
            console.error('Error in PDF text extraction:', error);
            throw new Error(`PDF extraction failed: ${error.message}`);
        }
    }

    fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    // =================================================================
    //  REFACTORED PARSING LOGIC
    // =================================================================
    parseProfileFromText(text) {
        console.log('Parsing profile using state-machine approach...');

        const profile = {
            fullName: '', email: '', phone: '', location: '',
            summary: '', experience: '', skills: '', education: '',
            degree: '', university: '', projects: ''
        };

        const lines = text.split('\n').map(line => line.trim()).filter(line => line);

        // Define regex for section headers. They should be on a line by themselves.
        const sectionMatchers = {
            summary: /^(summary|profile|objective|about me)$/i,
            experience: /^(experience|work experience|employment|professional experience|career)$/i,
            education: /^(education|academic background|qualifications)$/i,
            skills: /^(skills|technical skills|competencies|technologies)$/i,
            projects: /^(projects|personal projects|selected projects)$/i,
        };

        let currentSection = 'header'; // Start in the 'header' to find name, email, etc.
        const headerLines = [];

        // --- Main Parsing Loop (State Machine) ---
        for (const line of lines) {
            let isSectionHeader = false;
            for (const [section, regex] of Object.entries(sectionMatchers)) {
                if (regex.test(line)) {
                    currentSection = section;
                    isSectionHeader = true;
                    console.log(`Switched to section: ${currentSection}`);
                    break;
                }
            }

            if (isSectionHeader) continue; // Don't add the header title to the content

            switch (currentSection) {
                case 'header':
                    headerLines.push(line);
                    break;
                case 'summary':
                    profile.summary += line + '\n';
                    break;
                case 'experience':
                    profile.experience += line + '\n';
                    break;
                case 'education':
                    profile.education += line + '\n';
                    break;
                case 'skills':
                    profile.skills += line + '\n';
                    break;
                case 'projects':
                    profile.projects += line + '\n';
                    break;
            }
        }
        
        // --- Post-Processing and Extraction from Sections ---

        // 1. Parse the header for contact info, name, and location
        const headerText = headerLines.join('\n');
        profile.email = (headerText.match(/[\w\.-]+@[\w\.-]+\.\w+/) || [''])[0];
        profile.phone = (headerText.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/)?.[0] || '').trim();

        // Location: Look for "City, State/Country" patterns but filter out things that aren't locations.
        const locationCandidates = [...headerText.matchAll(/\b([A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*,\s*[A-Z][a-zA-Z\s]{2,})\b/g)].map(m => m[0]);
        const nonLocationKeywords = ['University', 'College', 'Bachelor', 'Master', 'Ph.D', 'High School', 'Experience'];
        profile.location = locationCandidates.find(loc => !nonLocationKeywords.some(keyword => loc.toLowerCase().includes(keyword.toLowerCase()))) || '';

        // Name: The most prominent, non-contact-info line in the header is likely the name.
        for (const line of headerLines) {
            if (line.includes('@') || line.match(/\d{3}/) || line.toLowerCase().includes('linkedin') || profile.location && line.includes(profile.location)) {
                continue;
            }
            if (line.split(' ').length >= 2 && line.split(' ').length <= 4 && /[A-Z]/.test(line[0])) {
                profile.fullName = line;
                break;
            }
        }
        // Fallback if no name is found
        if (!profile.fullName && headerLines.length > 0) {
            profile.fullName = headerLines[0];
        }

        // 2. Parse Education section for Degree and University
        if (profile.education) {
            const eduLines = profile.education.split('\n').filter(Boolean);
            const degreeKeywords = ['Bachelor', 'B.S', 'B.Sc', 'Master', 'M.S', 'M.Sc', 'Ph.D', 'MBA', 'Associate', 'Diploma'];
            const universityKeywords = ['University', 'College', 'Institute', 'School', 'Academy'];

            for (const line of eduLines) {
                if (!profile.degree && degreeKeywords.some(kw => line.includes(kw))) {
                    profile.degree = line;
                }
                if (!profile.university && universityKeywords.some(kw => line.includes(kw))) {
                    profile.university = line;
                }
            }
            // Fallback: If specific lines aren't found, grab the first two lines
            if (!profile.university && eduLines[0]) profile.university = eduLines[0];
            if (!profile.degree && eduLines[1]) profile.degree = eduLines[1];
        }

        // 3. Clean up Skills section
        if (profile.skills) {
            // Remove long descriptive sentences that likely bled in from another section.
            // A skill is usually a short word or a phrase.
            const cleanedSkills = profile.skills.split('\n')
                .map(s => s.replace(/.*:/, '').trim()) // Remove category titles like "Languages:"
                .flatMap(s => s.split(',')) // Split comma-separated skills
                .map(s => s.trim())
                .filter(s => s.length > 1 && s.length < 30 && !s.toLowerCase().includes('experience'))
                .join(', ');
            profile.skills = cleanedSkills;
        }

        // 4. Clean up Projects and Experience
        // This is tricky, but we can remove blank lines for better formatting.
        // The state machine has already done the hard work of separating them.
        if (profile.experience) {
            profile.experience = profile.experience.replace(/\n{2,}/g, '\n').trim();
        }
        if (profile.projects) {
            profile.projects = profile.projects.replace(/\n{2,}/g, '\n').trim();
        }
        
        // Final trim on all fields
        for(const key in profile) {
            if (typeof profile[key] === 'string') {
                profile[key] = profile[key].trim();
            }
        }

        console.log('Parsed profile:', profile);
        return profile;
    }
}

// Export for use in other scripts
window.PDFParser = PDFParser;