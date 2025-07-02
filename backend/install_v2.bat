@echo off
REM V2 Installation Script for Intelligent Selection Pipeline

echo Installing V2 Intelligent Selection Pipeline dependencies...

REM Install Python packages
pip install spacy==3.7.2
pip install numpy==1.24.3
pip install scikit-learn==1.3.0
pip install langchain==0.1.0
pip install sentence-transformers==2.2.2

REM Download spaCy English model
echo Downloading spaCy English model...
python -m spacy download en_core_web_sm

echo V2 Dependencies installed successfully!
echo You can now use the advanced intelligent selection features.
pause
