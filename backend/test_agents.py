"""
Test script for the V3 Agent System
"""

import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agent_system import SyncAgentOrchestrator, AgentContext
from intelligent_selection_lite import intelligent_selector_lite, JobAnalysis
from models import UserProfile

def test_agent_system():
    """Test the agent system with sample data."""
    
    # Load environment
    load_dotenv()
    
    # Check API key
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        print("❌ GEMINI_API_KEY not found. Please set it in .env file")
        return False
    
    try:
        # Initialize Gemini
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        print("✅ Gemini model initialized")
        
        # Initialize agent system
        agent_orchestrator = SyncAgentOrchestrator(model)
        print("✅ Agent orchestrator initialized")
        
        # Initialize intelligent selector
        intelligent_selector_lite.initialize()
        print("✅ Intelligent selector initialized")
        
        # Sample data
        sample_job_description = """
        Software Engineer - Frontend
        Google
        
        We're looking for a passionate frontend engineer to join our team building next-generation web applications. You'll work with React, TypeScript, and modern web technologies to create exceptional user experiences.
        
        Requirements:
        - 3+ years of React experience
        - Strong TypeScript skills
        - Experience with modern web development
        - Collaborative mindset
        - Passion for user experience
        
        At Google, we value innovation, collaboration, and making an impact at scale.
        """
        
        sample_profile = {
            'fullName': 'Alex Developer',
            'email': 'alex@example.com',
            'summary': 'Frontend developer with 4 years of experience building React applications',
            'skills': 'React, TypeScript, JavaScript, HTML, CSS, Node.js',
            'projects': [
                {
                    'title': 'E-commerce Platform',
                    'description': 'Built a full-stack e-commerce platform using React, TypeScript, and Node.js. Implemented responsive design and optimized for performance.'
                },
                {
                    'title': 'Task Management App',
                    'description': 'Developed a collaborative task management application with real-time updates using React and WebSocket technology.'
                }
            ],
            'experiences': [
                {
                    'title': 'Frontend Developer',
                    'description': 'Led frontend development for a fintech startup, building user interfaces with React and TypeScript. Collaborated with design team to implement pixel-perfect UIs.'
                }
            ]
        }
        
        # Test the pipeline
        print("\n🧪 Testing agent pipeline...")
        
        # Step 1: Analyze job
        job_analysis = intelligent_selector_lite.analyze_job_description(sample_job_description)
        print(f"📊 Job analysis: {len(job_analysis.required_skills)} skills, {len(job_analysis.key_concepts)} concepts")
        
        # Step 2: Rank assets
        ranked_assets = intelligent_selector_lite.rank_profile_assets(job_analysis, sample_profile)
        print(f"📈 Ranked {len(ranked_assets)} assets")
        
        # Step 3: Create agent context
        agent_context = AgentContext(
            job_description=sample_job_description,
            user_profile=sample_profile,
            job_analysis=job_analysis,
            selected_assets=ranked_assets[:3]  # Top 3 assets
        )
        
        # Step 4: Generate cover letter
        print("\n🤖 Generating cover letter with agents...")
        cover_letter = agent_orchestrator.generate_cover_letter(agent_context)
        
        print("\n📝 Generated Cover Letter:")
        print("-" * 50)
        print(cover_letter)
        print("-" * 50)
        
        # Validate output
        if len(cover_letter) > 100 and "react" in cover_letter.lower():
            print("\n✅ Agent system test PASSED!")
            print(f"   - Output length: {len(cover_letter)} characters")
            print(f"   - Contains relevant skills: ✅")
            return True
        else:
            print("\n❌ Agent system test FAILED!")
            print(f"   - Output length: {len(cover_letter)} characters")
            print(f"   - Contains relevant skills: {'✅' if 'react' in cover_letter.lower() else '❌'}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing agent system: {e}")
        import traceback
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    print("🚀 Testing V3 Agent System...")
    success = test_agent_system()
    
    if success:
        print("\n🎉 All tests passed! Agent system is ready.")
        print("\nNext steps:")
        print("1. Set AGENT_MODE=true in your .env file")
        print("2. Restart your backend server")
        print("3. Test with your Chrome extension")
    else:
        print("\n⚠️  Tests failed. Please check the errors above.")
        print("\nTroubleshooting:")
        print("1. Ensure GEMINI_API_KEY is set correctly")
        print("2. Check your internet connection")
        print("3. Verify all dependencies are installed")
