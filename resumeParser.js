// resumeParser.js - Handles parsing uploaded resumes (TXT, PDF, DOCX)

// Load libraries (only for PDF and DOCX)
// You need to include pdf.js and mammoth.js in your popup.html or via import

function parseResume(file, callback) {
    const reader = new FileReader();
    const fileType = file.name.split('.').pop().toLowerCase();

    if (fileType === 'txt') {
        reader.onload = () => {
            callback(reader.result);
        };
        reader.readAsText(file);
    } else if (fileType === 'pdf') {
        reader.onload = async () => {
            const pdfData = new Uint8Array(reader.result);
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n';
            }
            callback(text);
        };
        reader.readAsArrayBuffer(file);
    } else if (fileType === 'docx') {
        reader.onload = () => {
            const arrayBuffer = reader.result;
            mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                .then(result => callback(result.value))
                .catch(err => callback('Error reading DOCX file: ' + err));
        };
        reader.readAsArrayBuffer(file);
    } else {
        callback('Unsupported file type. Please upload .txt, .pdf, or .docx');
    }
}
