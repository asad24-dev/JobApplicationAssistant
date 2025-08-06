#!/bin/bash
# Post-install script for Render deployment

echo "🚀 Running post-install setup..."

# Download spaCy English model
echo "📦 Downloading spaCy English model..."
python -m spacy download en_core_web_sm

echo "✅ Post-install setup complete!"
