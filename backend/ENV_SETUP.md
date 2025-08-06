# Job Application Assistant - Environment Configuration

## Required Environment Variables

```env
# Gemini AI Configuration (REQUIRED)
GEMINI_API_KEY=your_gemini_api_key_here

# AI Model Settings
MODEL_NAME=gemini-1.5-flash
TEMPERATURE=0.7
MAX_TOKENS=1500

# Server Configuration
HOST=127.0.0.1
PORT=8000
DEBUG=true

# V2 Intelligence Pipeline Settings
SELECTION_THRESHOLD=5.0
MAX_PROJECTS=3
MAX_EXPERIENCES=2

# V3 Agent System Settings (NEW!)
AGENT_MODE=true

# Logging Configuration
LOG_LEVEL=INFO
```

## Generation Modes

### V2 Pipeline (AGENT_MODE=false)
- Single-prompt generation
- Uses intelligent asset selection
- Fast and reliable
- Good for most use cases

### V3 Agent System (AGENT_MODE=true) 
- Multi-step agent reasoning
- Research → Strategy → Writing
- More human-like and personalized
- Best for cover letters
- Slightly slower but higher quality

## How to Enable Agent Mode

1. Add `AGENT_MODE=true` to your `.env` file
2. Restart the backend server
3. The system will automatically use the agent pipeline for cover letters
4. Other content types will fall back to V2 pipeline

## Testing the Agent System

1. Set `AGENT_MODE=true` in `.env`
2. Restart: `python main.py`
3. Look for log message: "Agent Mode enabled: True"
4. Generate a cover letter and check logs for "V3 MULTI-AGENT GENERATION PIPELINE"

## Fallback Behavior

- If agents fail, automatically falls back to V2 pipeline
- If Gemini API is unavailable, uses mock content
- Graceful degradation ensures system always responds
