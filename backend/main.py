from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import logging
import traceback
import re
from datetime import datetime
import os
from dotenv import load_dotenv
import google.generativeai as genai

from models import ApplicationData, GenerationResponse, ErrorResponse, HealthResponse
from intelligent_selection_lite import intelligent_selector_lite, JobAnalysis, ProfileAsset
from advanced_prompts import prompt_builder, PromptContext
from agent_system import SyncAgentOrchestrator, AgentContext

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
AGENT_MODE = os.getenv("AGENT_MODE", "false").lower() == "true"
logger.info(f"Agent Mode enabled: {AGENT_MODE}")

# Configure Gemini AI
gemini_api_key = os.getenv("GEMINI_API_KEY")
logger.info(f"API Key loaded: {'Yes' if gemini_api_key else 'No'}")
if gemini_api_key:
    logger.info(f"API Key length: {len(gemini_api_key)} characters")
    try:
        genai.configure(api_key=gemini_api_key)
        model_name = os.getenv("MODEL_NAME", "gemini-1.5-flash")
        logger.info(f"Attempting to initialize model: {model_name}")
        model = genai.GenerativeModel(model_name)
        logger.info("Gemini model successfully initialized")
        
        # Initialize V2 Intelligent Selection Pipeline
        intelligent_selector_lite.initialize()
        logger.info("V2 Intelligent Selection Pipeline initialized")
        
        # Initialize V3 Agent System
        agent_orchestrator = SyncAgentOrchestrator(model)
        logger.info("V3 Agent System initialized")
        
    except Exception as e:
        logger.error(f"Failed to initialize Gemini model: {str(e)}")
        model = None
        agent_orchestrator = None
else:
    logger.warning("GEMINI_API_KEY not found in environment variables")
    model = None
    agent_orchestrator = None

# Create FastAPI app
app = FastAPI(
    title="Job Application Assistant API",
    description="AI-powered job application content generation using RAG",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://*",  # Allow all Chrome extensions
        "http://localhost:3000",  # For testing
        "http://127.0.0.1:3000",  # For testing
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - health check."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.now().isoformat()
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.now().isoformat()
    )

@app.post("/generate", response_model=GenerationResponse)
async def generate_content(application_data: ApplicationData):
    """
    Generate personalized application content using Gemini AI.
    
    This endpoint processes user profile and job description data
    to create personalized cover letters, application responses, etc.
    """
    start_time = time.time()
    
    try:
        logger.info(f"Received request to generate {application_data.content_type}")
        logger.info(f"User: {application_data.user_profile.fullName}")
        logger.info(f"Model available: {model is not None}")
        logger.info(f"Job description length: {len(application_data.job_description)}")
        
        # Check if Gemini is available
        if not model:
            logger.warning("Gemini model not available, using mock content")
            generated_content = create_mock_content(application_data)
            token_usage = None
        else:
            # Choose generation method based on configuration
            if AGENT_MODE and agent_orchestrator:
                logger.info("Using V3 Agent System for generation")
                generated_content, token_usage = await generate_with_agents(application_data)
            else:
                logger.info("Using V2 Pipeline for generation")
                generated_content, token_usage = await generate_with_gemini(application_data)
        
        processing_time = time.time() - start_time
        
        response = GenerationResponse(
            generated_content=generated_content,
            content_type=application_data.content_type,
            success=True,
            processing_time=round(processing_time, 2),
            token_usage=token_usage
        )
        
        logger.info(f"Successfully generated content in {processing_time:.2f}s")
        return response
        
    except Exception as e:
        logger.error(f"Error generating content: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        processing_time = time.time() - start_time
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Content generation failed",
                "detail": str(e),
                "success": False
            }
        )

async def generate_with_agents(application_data: ApplicationData) -> tuple[str, dict]:
    """
    V3: Generate content using Multi-Agent System with advanced reasoning.
    """
    try:
        logger.info("=== V3 MULTI-AGENT GENERATION PIPELINE ===")
        
        # Step 1: Analyze Job Description (using existing pipeline)
        logger.info("Step 1: Analyzing job description...")
        job_analysis = intelligent_selector_lite.analyze_job_description(application_data.job_description)
        logger.info(f"Found {len(job_analysis.required_skills)} required skills, {len(job_analysis.key_concepts)} key concepts")
        
        # Step 2: Rank User Assets (using existing pipeline)
        logger.info("Step 2: Ranking user profile assets...")
        user_profile_dict = application_data.user_profile.dict()
        ranked_assets = intelligent_selector_lite.rank_profile_assets(job_analysis, user_profile_dict)
        
        # Apply environment variable thresholds
        selection_threshold = float(os.getenv("SELECTION_THRESHOLD", 5.0))
        max_projects = int(os.getenv("MAX_PROJECTS", 3))
        max_experiences = int(os.getenv("MAX_EXPERIENCES", 2))
        
        # Filter by threshold and apply limits
        filtered_assets = [asset for asset in ranked_assets if asset.score >= selection_threshold]
        
        # Separate into projects and experiences
        projects = [asset for asset in filtered_assets if 'project' in asset.title.lower() or 'built' in asset.description.lower()]
        experiences = [asset for asset in filtered_assets if asset not in projects]
        
        selected_projects = projects[:max_projects]
        selected_experiences = experiences[:max_experiences]
        
        logger.info(f"Selected {len(selected_projects)} projects and {len(selected_experiences)} experiences (threshold: {selection_threshold})")
        
        # Step 3: Create Agent Context
        logger.info("Step 3: Creating agent context...")
        agent_context = AgentContext(
            job_description=application_data.job_description,
            user_profile=user_profile_dict,
            job_analysis=job_analysis,
            selected_assets=selected_projects + selected_experiences
        )
        
        # Step 4: Run Agent Pipeline
        logger.info("Step 4: Running multi-agent generation...")
        if application_data.content_type == "cover_letter":
            generated_content = agent_orchestrator.generate_cover_letter(agent_context)
        else:
            # Fall back to V2 pipeline for other content types
            logger.info("Falling back to V2 pipeline for non-cover-letter content")
            prompt_context = PromptContext(
                user_profile=user_profile_dict,
                job_analysis=job_analysis,
                selected_projects=selected_projects,
                selected_experiences=selected_experiences,
                content_type=application_data.content_type,
                questions=application_data.questions
            )
            
            if application_data.content_type == "questions":
                prompt = prompt_builder.build_questions_prompt(prompt_context)
            else:
                raise ValueError(f"Unsupported content type: {application_data.content_type}")
            
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=float(os.getenv("TEMPERATURE", 0.7)),
                    max_output_tokens=int(os.getenv("MAX_TOKENS", 1500)),
                )
            )
            generated_content = response.text
        
        # Calculate token usage
        prompt_estimate = 1000  # Rough estimate for agent prompts
        completion_tokens = int(len(generated_content.split()) * 1.3)
        token_usage = {
            "prompt_tokens": prompt_estimate,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_estimate + completion_tokens
        }
        
        logger.info(f"V3 Agent generation successful! Output length: {len(generated_content)} characters [MULTI-AGENT MODE]")
        return generated_content, token_usage
        
    except Exception as e:
        logger.error(f"V3 Agent generation error: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        
        # Fallback to V2 pipeline
        logger.info("Falling back to V2 pipeline due to agent error")
        return await generate_with_gemini(application_data)

async def generate_with_gemini(application_data: ApplicationData) -> tuple[str, dict]:
    """
    V2: Generate content using Gemini AI with Intelligent Selection Pipeline.
    """
    try:
        logger.info("=== V2 INTELLIGENT GENERATION PIPELINE ===")
        
        # Step 1: Analyze Job Description
        logger.info("Step 1: Analyzing job description...")
        job_analysis = intelligent_selector_lite.analyze_job_description(application_data.job_description)
        logger.info(f"Found {len(job_analysis.required_skills)} required skills, {len(job_analysis.key_concepts)} key concepts")
        
        # Step 2: Rank User Assets
        logger.info("Step 2: Ranking user profile assets...")
        user_profile_dict = application_data.user_profile.dict()
        ranked_assets = intelligent_selector_lite.rank_profile_assets(job_analysis, user_profile_dict)
        logger.info(f"Ranked {len(ranked_assets)} total assets")
        
        # Step 3: Select Best Assets
        logger.info("Step 3: Selecting most relevant assets...")
        selected_assets = intelligent_selector_lite.select_best_assets(ranked_assets)
        
        # Step 4: Build Advanced Prompt
        logger.info("Step 4: Building hyper-focused prompt...")
        
        # Separate selected assets into projects and experiences based on description content
        selected_projects = [asset for asset in selected_assets if 'project' in asset.title.lower() or 'built' in asset.description.lower()]
        selected_experiences = [asset for asset in selected_assets if asset not in selected_projects]
        
        prompt_context = PromptContext(
            user_profile=user_profile_dict,
            job_analysis=job_analysis,
            selected_projects=selected_projects,
            selected_experiences=selected_experiences,
            content_type=application_data.content_type,
            questions=application_data.questions
        )
        
        if application_data.content_type == "cover_letter":
            prompt = prompt_builder.build_cover_letter_prompt(prompt_context)
        elif application_data.content_type == "questions":
            prompt = prompt_builder.build_questions_prompt(prompt_context)
        else:
            raise ValueError(f"Unsupported content type: {application_data.content_type}")
        
        logger.info(f"Generated prompt length: {len(prompt)} characters")
        
        # Step 5: Generate with Gemini
        logger.info("Step 5: Generating content with Gemini...")
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=float(os.getenv("TEMPERATURE", 0.7)),
                max_output_tokens=int(os.getenv("MAX_TOKENS", 1500)),  # Increased for richer content
            )
        )
        
        generated_content = response.text
        
        # Enhanced token usage calculation
        prompt_tokens = int(len(prompt.split()) * 1.3)
        completion_tokens = int(len(generated_content.split()) * 1.3)
        token_usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens
        }
        
        # Log generation success with intelligence metrics
        logger.info(f"V2 Generation successful! Used {len(selected_projects)} projects, {len(selected_experiences)} experiences [INTELLIGENT PIPELINE]")
        logger.info(f"Job match score: Skills={len(job_analysis.required_skills)}, Concepts={len(job_analysis.key_concepts)}")
        
        return generated_content, token_usage
        
    except Exception as e:
        logger.error(f"V2 Gemini generation error: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        
        # Check if it's a quota error
        if "quota" in str(e).lower() or "429" in str(e):
            logger.warning("API quota exceeded, falling back to enhanced mock content")
        else:
            logger.warning("Other API error, falling back to enhanced mock content")
        
        # Enhanced fallback with some intelligence
        return create_enhanced_mock_content(application_data), None

def create_prompt(application_data: ApplicationData) -> str:
    """
    Create a detailed prompt for Gemini based on the application data.
    """
    profile = application_data.user_profile
    content_type = application_data.content_type
    
    base_prompt = f"""
You are an expert career counselor and professional writer specializing in job applications. 
Create a professional, personalized, and compelling {content_type.replace('_', ' ')} based on the following information:

CANDIDATE PROFILE:
- Name: {profile.fullName}
- Email: {profile.email}
- Location: {profile.location or 'Not specified'}
- Summary: {profile.summary or 'Not provided'}
- Experience: {profile.experience or 'Not provided'}
- Skills: {profile.skills or 'Not provided'}
- Education: {profile.education or 'Not provided'}
- Projects: {profile.projects or 'Not provided'}

JOB DESCRIPTION:
{application_data.job_description}

"""

    if content_type == "cover_letter":
        base_prompt += """
Please write a professional cover letter that:
1. Opens with a strong, attention-grabbing introduction
2. Highlights relevant experience and skills that match the job requirements
3. Shows genuine interest in the company and position
4. Demonstrates value the candidate can bring to the organization
5. Closes with a professional call to action
6. Is concise but compelling (aim for 3-4 paragraphs)
7. Uses a professional but warm tone
8. Avoids generic phrases and clichés
9. Provide concrete examples from the candidate's experience
10. Show alignment with the company's values and needs
11. doesnt use excessive punctuation such as dashes for non independent clauses

Format the letter properly with salutation and closing.
"""
    elif content_type == "questions":
        if not application_data.questions:
            base_prompt += """
Since no specific questions were provided, please generate responses to common application questions such as:
1. Why are you interested in this position?
2. What makes you a good fit for this role?
3. Describe your relevant experience.
4. What are your strengths?
5. Why do you want to work for this company?

Provide personalized, specific answers based on the candidate's profile and the job description.
"""
        else:
            base_prompt += f"""
APPLICATION QUESTIONS TO ANSWER:
{application_data.questions}

Please provide thoughtful, specific responses to these application questions that:
1. Directly address what's being asked
2. Provide concrete examples from the candidate's experience
3. Show alignment with the company's values and needs
4. Demonstrate self-awareness and growth mindset
5. Are concise but detailed enough to stand out
6. Use the STAR method (Situation, Task, Action, Result) where appropriate
7. Reference specific details from the job description when relevant

For each question, provide a complete, well-structured answer.
"""
    
    base_prompt += "\n\nGenerate only the requested content without any preamble or explanation."
    
    return base_prompt

def create_enhanced_mock_content(application_data: ApplicationData) -> str:
    """
    Create enhanced mock content using basic intelligent selection.
    Fallback when AI is not available but still shows some intelligence.
    """
    profile = application_data.user_profile
    job_desc_preview = application_data.job_description[:300] + "..." if len(application_data.job_description) > 300 else application_data.job_description
    
    # Basic skill extraction from job description
    tech_skills = ["python", "javascript", "react", "node.js", "aws", "sql", "docker", "git"]
    found_skills = [skill for skill in tech_skills if skill.lower() in application_data.job_description.lower()]
    
    if application_data.content_type == "cover_letter":
        return f"""Dear Hiring Manager,

I am excited to apply for this position at your organization. After reviewing the job description, I am confident that my background in {profile.skills or 'software development'} and experience with {', '.join(found_skills[:3]) if found_skills else 'relevant technologies'} makes me an ideal candidate.

In my role as described in my experience: {(profile.experience or 'Previous positions')[:200]}..., I have developed strong expertise in the key areas you're seeking. Specifically, my work with {', '.join(found_skills[:2]) if found_skills else 'modern technologies'} directly aligns with your requirements.

What particularly excites me about this opportunity is: {job_desc_preview}

My technical skills include {profile.skills or 'various programming languages and frameworks'}, and my educational background in {profile.education or 'computer science'} has provided me with a solid foundation for this role.

I would welcome the opportunity to discuss how my experience and passion for {found_skills[0] if found_skills else 'technology'} can contribute to your team's success.

Best regards,
{profile.fullName}
{profile.email}
{profile.phone or ''}

---
[ENHANCED MOCK CONTENT - V2 with Basic Intelligence]
Job skills detected: {', '.join(found_skills) if found_skills else 'None detected'}
Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Profile processed: {len(str(profile.dict()))} characters
Job description processed: {len(application_data.job_description)} characters
"""

    elif application_data.content_type == "questions":
        questions_text = application_data.questions or "Common application questions"
        return f"""INTELLIGENT APPLICATION QUESTION RESPONSES

Based on your profile and job analysis, here are strategic responses:

Question 1: Why are you interested in this position?
Answer: This role perfectly aligns with my background in {profile.skills or 'software development'}. I'm particularly drawn to the opportunity to work with {', '.join(found_skills[:2]) if found_skills else 'cutting-edge technologies'} as mentioned in the job description. My experience with {(profile.experience or 'relevant projects')[:100]}... has prepared me well for the challenges described.

Question 2: What makes you a good fit for this role?
Answer: My technical expertise in {', '.join(found_skills[:3]) if found_skills else 'relevant technologies'} directly matches your requirements. Additionally, my {profile.education or 'educational background'} and proven track record of {(profile.experience or 'delivering successful projects')[:100]}... demonstrate my ability to contribute immediately.

Question 3: Describe your relevant experience.
Answer: {profile.experience or 'I have gained valuable experience through various projects and roles'}. Specifically, my work involved {', '.join(found_skills) if found_skills else 'modern development practices'}, which I understand are central to this position based on the job requirements.

[Additional responses would be tailored based on specific questions provided]

---
[ENHANCED MOCK CONTENT - V2 with Basic Intelligence]
Job skills detected: {', '.join(found_skills) if found_skills else 'None detected'}
Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Questions processed: {len(questions_text)} characters
Profile processed: {len(str(profile.dict()))} characters
Job description processed: {len(application_data.job_description)} characters
"""

    return f"[ENHANCED MOCK] Generated {application_data.content_type} content for {profile.fullName}"

def create_mock_content(application_data: ApplicationData) -> str:
    """
    Create mock content for testing purposes.
    This will be replaced with actual AI generation.
    """
    profile = application_data.user_profile
    job_desc_preview = application_data.job_description[:200] + "..." if len(application_data.job_description) > 200 else application_data.job_description
    
    if application_data.content_type == "cover_letter":
        return f"""Dear Hiring Manager,

I am writing to express my strong interest in the position at your company. 

With my background in {profile.skills or 'relevant technologies'} and experience in {profile.experience or 'software development'}, I am confident I would be a valuable addition to your team.

Key qualifications that make me a strong candidate:
• Technical expertise: {profile.skills or 'Programming languages and frameworks'}
• Professional experience: {profile.experience or 'Years of relevant experience'}
• Educational background: {profile.education or 'Relevant degree and certifications'}

I am particularly drawn to this opportunity because: {job_desc_preview}

{profile.summary or 'I am passionate about technology and always eager to take on new challenges.'}

Thank you for considering my application. I look forward to discussing how my skills and enthusiasm can contribute to your team's success.

Best regards,
{profile.fullName}
{profile.email}
{profile.phone or ''}

---
[MOCK CONTENT - Will be replaced with AI generation]
Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Profile processed: {len(str(profile.dict()))} characters
Job description processed: {len(application_data.job_description)} characters
"""

    elif application_data.content_type == "questions":
        questions_text = application_data.questions or "Common application questions"
        return f"""PERSONALIZED APPLICATION QUESTION RESPONSES

Based on your profile and the job description, here are thoughtful responses:

Question 1: Why are you interested in this position?
Answer: Given my background in {profile.skills or 'relevant skills'} and {profile.experience or 'professional experience'}, I'm excited about this role because it aligns perfectly with my career goals. The job description mentions {job_desc_preview}, which resonates with my passion for {profile.summary or 'continuous learning and growth'}.

Question 2: What makes you a good fit for this role?
Answer: My experience with {profile.experience or 'relevant projects'} has prepared me well for this position. Specifically, my skills in {profile.skills or 'key technologies'} and educational background in {profile.education or 'relevant field'} make me uniquely qualified to contribute to your team.

Question 3: Describe your relevant experience.
Answer: {profile.experience or 'I have gained valuable experience through various projects and roles'}. Additionally, my work on {profile.projects or 'key projects'} has given me hands-on experience with the technologies and methodologies mentioned in your job posting.

[Additional responses would be generated based on specific questions provided]

---
[MOCK CONTENT - Will be replaced with AI generation]
Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Questions processed: {len(questions_text)} characters
Profile processed: {len(str(profile.dict()))} characters
Job description processed: {len(application_data.job_description)} characters
"""

    return f"[MOCK] Generated {application_data.content_type} content for {profile.fullName}"

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler."""
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
