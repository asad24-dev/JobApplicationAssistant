# Quick Test Guide 🧪

## Step 1: Verify Backend is Running ✅
The backend is currently running on http://127.0.0.1:8000

### Test Health Endpoint
1. Open: http://127.0.0.1:8000/health
2. Should return: `{"status":"healthy","timestamp":"..."}`

### Test API Documentation
1. Open: http://127.0.0.1:8000/docs
2. Should show interactive Swagger UI

## Step 2: Test Backend with HTML Test Page
1. Open the test file: `test-backend.html` in your browser
2. Click "Test Health Endpoint" → Should show ✅ success
3. Click "Test Generate Endpoint" → Should show ✅ success with mock response

## Step 3: Load Chrome Extension
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the project root folder: `JobApplicationAssistant`
6. Extension should appear in toolbar

## Step 4: Test Extension Functionality

### Test Profile Tab
1. Click extension icon → Opens popup
2. Go to "Profile" tab
3. Fill in some test data (name, email, etc.)
4. Click "Save Profile"
5. Should show success message

### Test Generate Tab (Backend Communication)
1. Go to "Generate" tab
2. Fill in optional fields (company name, position)
3. Click "Generate Content"
4. Should contact backend and show mock response

## Expected Results

### ✅ Backend Health Check
```json
{
  "status": "healthy",
  "timestamp": "2025-01-02T00:46:22.123456"
}
```

### ✅ Generate Endpoint Response
```json
{
  "generated_content": "[MOCK CONTENT - Will be replaced with AI generation]\nGenerated at: 2025-01-02 00:46:22",
  "content_type": "cover_letter",
  "processing_time": 0.02,
  "token_usage": null,
  "metadata": {
    "user_name": "Test User",
    "company_name": "Test Company",
    "content_length": 89
  }
}
```

## Troubleshooting

### Backend Not Responding
```bash
cd "backend"
.\venv\Scripts\activate
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Extension Not Loading
- Check Chrome DevTools Console for errors
- Verify manifest.json is valid
- Ensure all files are in correct location

### CORS Issues
- Backend has CORS enabled for all origins
- Check Network tab in DevTools for failed requests

## Success Indicators ✅
- [ ] Backend health check returns 200 OK
- [ ] API docs load at /docs
- [ ] Test HTML page shows successful API calls
- [ ] Chrome extension loads without errors
- [ ] Extension can save profile data
- [ ] Extension can call backend /generate endpoint
- [ ] Backend returns mock response

## Ready for AI Integration 🚀
Once all tests pass, you're ready to:
1. Add real OpenAI API key to `.env`
2. Implement actual content generation
3. Add LangChain for advanced features
