#!/bin/bash

echo "🚀 Setting up V3 Agent System for Job Application Assistant"
echo

echo "📋 Checking current environment..."

if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Creating sample .env file..."
    cat > .env << 'EOF'
# Gemini AI Configuration
GEMINI_API_KEY=your_api_key_here

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

# V3 Agent System Settings
AGENT_MODE=true

# Logging Configuration
LOG_LEVEL=INFO
EOF
    echo "✅ Sample .env file created"
    echo "⚠️  Please edit .env and add your actual GEMINI_API_KEY"
    echo
fi

echo "🧪 Testing agent system..."
python test_agents.py

echo
echo "📖 Next steps:"
echo "1. Ensure your GEMINI_API_KEY is set in .env"
echo "2. Set AGENT_MODE=true to enable the new agent system"
echo "3. Run: python main.py"
echo "4. Test with your Chrome extension"
echo
echo "📚 Documentation: Check ENV_SETUP.md for details"
