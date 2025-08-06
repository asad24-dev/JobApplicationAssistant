@echo off
echo 🚀 Setting up V3 Agent System for Job Application Assistant

echo.
echo 📋 Checking current environment...

if not exist .env (
    echo ❌ .env file not found!
    echo Creating sample .env file...
    (
        echo # Gemini AI Configuration
        echo GEMINI_API_KEY=your_api_key_here
        echo.
        echo # AI Model Settings
        echo MODEL_NAME=gemini-1.5-flash
        echo TEMPERATURE=0.7
        echo MAX_TOKENS=1500
        echo.
        echo # Server Configuration
        echo HOST=127.0.0.1
        echo PORT=8000
        echo DEBUG=true
        echo.
        echo # V2 Intelligence Pipeline Settings
        echo SELECTION_THRESHOLD=5.0
        echo MAX_PROJECTS=3
        echo MAX_EXPERIENCES=2
        echo.
        echo # V3 Agent System Settings
        echo AGENT_MODE=true
        echo.
        echo # Logging Configuration
        echo LOG_LEVEL=INFO
    ) > .env
    echo ✅ Sample .env file created
    echo ⚠️  Please edit .env and add your actual GEMINI_API_KEY
    echo.
)

echo 🧪 Testing agent system...
python test_agents.py

echo.
echo 📖 Next steps:
echo 1. Ensure your GEMINI_API_KEY is set in .env
echo 2. Set AGENT_MODE=true to enable the new agent system
echo 3. Run: python main.py
echo 4. Test with your Chrome extension
echo.
echo 📚 Documentation: Check ENV_SETUP.md for details

pause
