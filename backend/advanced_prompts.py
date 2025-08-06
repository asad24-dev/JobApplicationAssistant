"""
Advanced Prompt Engineering Templates for V2 Intelligent Generation
"""

import re
from typing import Dict, List, Any
from dataclasses import dataclass
from intelligent_selection_lite import JobAnalysis, ProfileAsset

@dataclass
class PromptContext:
    """Complete context for prompt generation."""
    user_profile: Dict[str, Any]
    job_analysis: JobAnalysis
    selected_projects: List[ProfileAsset]
    selected_experiences: List[ProfileAsset]
    content_type: str
    questions: str = None

class AdvancedPromptBuilder:
    """
    Advanced prompt builder that creates hyper-focused, contextual prompts
    based on intelligent asset selection.
    """
    
    def build_cover_letter_prompt(self, context: PromptContext) -> str:
        """Build an intelligent cover letter prompt focused on storytelling and company alignment."""
        
        # Extract company values and culture from job description
        company_insights = self._extract_company_insights(context)
        personal_connection = self._build_personal_connection(context)
        storytelling_elements = self._build_storytelling_elements(context)
        
        prompt = f"""You are a master storyteller and career strategist who crafts cover letters that create emotional connections between candidates and hiring managers.

MISSION: Write a compelling, human cover letter that tells a story of why this specific candidate belongs at this specific company, going beyond just matching skills.

=== THE COMPANY & ROLE ===
Company: {context.job_analysis.company_name or 'the company'}
Position: {context.job_analysis.job_title}
Key Challenges: {', '.join(context.job_analysis.key_responsibilities[:3]) if context.job_analysis.key_responsibilities else 'Drive innovation and growth'}

=== COMPANY INSIGHTS ===
{company_insights}

=== CANDIDATE STORY ===
{storytelling_elements}

=== PERSONAL CONNECTION ===
{personal_connection}

=== STRATEGIC WRITING APPROACH ===

Write a cover letter that follows this psychological framework:

**PARAGRAPH 1 - THE HOOK (Why This Matters to Me)**
Open with a personal story or moment that connects you to this company's mission. Avoid generic openings. Instead, share what draws you to their work, their values, or their impact. Make it feel like a conversation, not a template.

**PARAGRAPH 2 - THE PROOF (Why I'm the Solution)**
Tell a specific story from your experience that demonstrates you solving a similar challenge they face. Use concrete details, outcomes, and emotions. Don't just list what you did - explain the impact and what you learned.

**PARAGRAPH 3 - THE VISION (Why We're Perfect Together)**
Paint a picture of what you'll accomplish together. Show you understand their goals and challenges. Explain how your unique background positions you to contribute in ways others can't.

**CLOSING - THE INVITATION**
End with genuine enthusiasm and a soft call to action that invites conversation rather than demanding it.

=== CRITICAL STYLE GUIDELINES ===

✅ DO:
- Write like a human having a professional conversation
- Use "I" statements and personal anecdotes
- Show genuine enthusiasm and curiosity about the company
- Include specific details that prove you researched them
- Connect your values to their mission
- Use transitional phrases that flow naturally
- Be conversational yet professional

❌ AVOID:
- Bullet points, dashes, or any formatting
- Generic phrases like "I am excited to apply"
- Listing skills without context
- Overly formal or robotic language
- Mentioning "your company" generically
- Template-sounding sentences
- Irrelevant technical jargon

**TARGET**: 280-320 words of authentic, compelling narrative that makes the hiring manager think "I need to meet this person."

Generate only the cover letter content as natural, flowing paragraphs."""

        return prompt
    
    def build_questions_prompt(self, context: PromptContext) -> str:
        """Build an intelligent application questions prompt."""
        
        questions_list = context.questions.split('|') if context.questions else [
            "Why are you interested in this position?",
            "What makes you a good fit for this role?", 
            "Describe your relevant experience.",
            "What are your greatest strengths?",
            "Why do you want to work for this company?"
        ]
        
        candidate_summary = self._build_candidate_summary(context)
        relevant_experience = self._build_relevant_experience(context)
        relevant_projects = self._build_relevant_projects(context)
        
        prompt = f"""You are an expert career counselor specializing in helping candidates provide outstanding responses to application questions.

MISSION: Create personalized, compelling answers that demonstrate clear value alignment and use the STAR method where appropriate.

=== JOB INTELLIGENCE ===
Company: {context.job_analysis.company_name}
Position: {context.job_analysis.job_title}
Required Skills: {', '.join(context.job_analysis.required_skills[:8])}
Key Requirements: {', '.join(context.job_analysis.key_concepts[:5])}

=== CANDIDATE PROFILE ===
{candidate_summary}

=== MOST RELEVANT EXPERIENCE ===
{relevant_experience}

=== MOST RELEVANT PROJECTS ===
{relevant_projects}

=== APPLICATION QUESTIONS ===
{chr(10).join(f"{i+1}. {q.strip()}" for i, q in enumerate(questions_list))}

=== RESPONSE INSTRUCTIONS ===
For each question, provide a comprehensive answer that:

1. **Directly addresses the question** - Stay focused and relevant
2. **Uses specific examples** from the relevant experience and projects above
3. **Demonstrates value alignment** with the job requirements
4. **Shows growth mindset** and self-awareness
5. **Uses the STAR method** (Situation, Task, Action, Result) for behavioral questions
6. **References company/role specifics** when relevant
7. **No need to reference an experience or a project in a question that does not ask for it** - Focus on the question itself


**FORMAT**: 
Question 1: [Question text]
Answer: [Your detailed response]

[Repeat for each question]

**TONE**: Confident, authentic, and professional, non-generic
**LENGTH**: 200-250 words per answer (may vary if it is a simple yes or no question)
**STYLE**: Be specific, use metrics when possible, avoid generic responses

Generate only the question-answer pairs without any preamble or explanation."""

        return prompt
    
    def _build_candidate_summary(self, context: PromptContext) -> str:
        """Build a focused candidate summary."""
        profile = context.user_profile
        
        return f"""Name: {profile.get('fullName', 'Candidate')}
Email: {profile.get('email', '')}
Location: {profile.get('location', 'Not specified')}
Professional Summary: {profile.get('summary', 'Not provided')}
Core Skills: {profile.get('skills', 'Not provided')}
Education: {profile.get('education', 'Not provided')}"""
    
    def _build_relevant_experience(self, context: PromptContext) -> str:
        """Build relevant experience section."""
        if not context.selected_experiences:
            return "No highly relevant experience found based on job requirements."
        
        experience_text = ""
        for i, exp in enumerate(context.selected_experiences, 1):
            matching_skills = ', '.join(exp.matching_skills) if exp.matching_skills else 'N/A'
            experience_text += f"""
Experience {i} (Relevance Score: {exp.score:.1f}):
Title: {exp.title}
Description: {exp.description}
Matching Skills: {matching_skills}
"""
        
        return experience_text.strip()
    
    def _build_relevant_projects(self, context: PromptContext) -> str:
        """Build relevant projects section."""
        if not context.selected_projects:
            return "No highly relevant projects found based on job requirements."
        
        projects_text = ""
        for i, project in enumerate(context.selected_projects, 1):
            matching_skills = ', '.join(project.matching_skills) if project.matching_skills else 'N/A'
            projects_text += f"""
Project {i} (Relevance Score: {project.score:.1f}):
Title: {project.title}
Description: {project.description}
Matching Skills: {matching_skills}
"""
        
        return projects_text.strip()
    
    def _build_job_alignment(self, context: PromptContext) -> str:
        """Build strategic job alignment section."""
        
        # Find overlapping skills
        user_skills = context.user_profile.get('skills', '').lower().split(', ')
        required_skills = [skill.lower() for skill in context.job_analysis.required_skills]
        overlapping_skills = [skill for skill in required_skills if any(user_skill in skill or skill in user_skill for user_skill in user_skills)]
        
        # Calculate experience match
        profile_summary = context.user_profile.get('summary', '') + ' ' + context.user_profile.get('experience', '')
        experience_years = len(re.findall(r'(\d+)\s*years?', profile_summary.lower()))
        
        return f"""Skill Overlap: {', '.join(overlapping_skills[:5]) if overlapping_skills else 'Focus on transferable skills'}
Experience Match: {"Strong match" if experience_years >= context.job_analysis.required_experience_years else "Emphasize growth potential"}
Key Selling Points: {', '.join(context.job_analysis.key_concepts[:3])}
Strategic Focus: Highlight {', '.join(context.job_analysis.required_skills[:3])} expertise"""

    def _extract_company_insights(self, context: PromptContext) -> str:
        """Extract company values, mission, and culture from job description."""
        job_text = context.user_profile.get('jobDescription', '').lower()
        
        # Common company value indicators
        value_keywords = {
            'innovation': ['innovative', 'innovation', 'cutting-edge', 'pioneering', 'breakthrough'],
            'collaboration': ['collaborative', 'teamwork', 'cross-functional', 'partnership'],
            'growth': ['growth', 'scale', 'expand', 'development', 'advancement'],
            'impact': ['impact', 'difference', 'change', 'transform', 'improve'],
            'customer-focus': ['customer', 'user', 'client', 'experience', 'satisfaction'],
            'quality': ['quality', 'excellence', 'best-in-class', 'standards', 'premium'],
            'diversity': ['diverse', 'inclusive', 'equality', 'belonging', 'varied']
        }
        
        detected_values = []
        for value, keywords in value_keywords.items():
            if any(keyword in job_text for keyword in keywords):
                detected_values.append(value)
        
        company_name = context.job_analysis.company_name or 'this organization'
        
        return f"""Company Values: {', '.join(detected_values[:4]) if detected_values else 'innovation, growth, excellence'}
Mission Focus: {context.job_analysis.key_concepts[0] if context.job_analysis.key_concepts else 'driving meaningful impact'}
Why {company_name}: Research their recent achievements, products, or initiatives mentioned in the job description"""

    def _build_storytelling_elements(self, context: PromptContext) -> str:
        """Build narrative elements from candidate's background."""
        profile = context.user_profile
        
        # Get the most relevant project and experience for storytelling
        top_project = context.selected_projects[0] if context.selected_projects else None
        top_experience = context.selected_experiences[0] if context.selected_experiences else None
        
        storytelling_text = f"""Professional Background: {profile.get('summary', 'Passionate professional with diverse experience')}

Key Narrative Elements:
"""
        
        if top_experience:
            storytelling_text += f"- Leadership Story: {top_experience.title} - {top_experience.description[:150]}...\n"
        
        if top_project:
            storytelling_text += f"- Innovation Story: {top_project.title} - {top_project.description[:150]}...\n"
        
        storytelling_text += f"""- Skills in Action: {', '.join(context.job_analysis.required_skills[:3])}
- Personal Values: {profile.get('interests', 'continuous learning, problem-solving, making an impact')}"""

        return storytelling_text

    def _build_personal_connection(self, context: PromptContext) -> str:
        """Build personal connection points with the company."""
        profile = context.user_profile
        company = context.job_analysis.company_name or 'the company'
        
        return f"""Personal Motivation: Connect your career goals to {company}'s mission
Shared Values: Align your interests ({profile.get('interests', 'technology, innovation')}) with their work
Future Vision: Describe how this role fits your long-term career aspirations
Unique Perspective: What unique background or viewpoint do you bring?"""

# Global instance
prompt_builder = AdvancedPromptBuilder()
