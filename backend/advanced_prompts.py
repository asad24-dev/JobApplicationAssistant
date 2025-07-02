"""
Advanced Prompt Engineering Templates for V2 Intelligent Generation
"""

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
        """Build an intelligent cover letter prompt."""
        
        # Build sections
        candidate_summary = self._build_candidate_summary(context)
        relevant_experience = self._build_relevant_experience(context)
        relevant_projects = self._build_relevant_projects(context)
        job_alignment = self._build_job_alignment(context)
        
        prompt = f"""You are an expert career counselor and professional writer specializing in creating compelling cover letters that win interviews.

MISSION: Create a personalized, compelling cover letter that demonstrates clear value alignment between the candidate and the specific role.

=== JOB INTELLIGENCE ===
Company: {context.job_analysis.company_name}
Position: {context.job_analysis.job_title}
Required Skills: {', '.join(context.job_analysis.required_skills[:8])}
Key Requirements: {', '.join(context.job_analysis.key_concepts[:5])}
Experience Level: {context.job_analysis.required_experience_years}+ years

=== CANDIDATE PROFILE ===
{candidate_summary}

=== MOST RELEVANT EXPERIENCE ===
{relevant_experience}

=== MOST RELEVANT PROJECTS ===
{relevant_projects}

=== STRATEGIC ALIGNMENT ===
{job_alignment}

=== WRITING INSTRUCTIONS ===
Create a professional cover letter that:

1. **Opening Hook**: Start with a compelling statement that immediately connects the candidate's strongest qualification to the role's biggest need.

2. **Value Proposition**: Use the relevant experience and projects above to demonstrate concrete value. Include specific metrics, technologies, and achievements that directly match the job requirements.

3. **Company Connection**: Show genuine interest in {context.job_analysis.company_name} and explain why this specific role aligns with the candidate's career goals.

4. **Technical Alignment**: Naturally weave in the required skills ({', '.join(context.job_analysis.required_skills[:5])}) through concrete examples rather than just listing them.

5. **Strong Close**: End with confidence and a clear call to action.

**TONE**: Professional yet personable, confident without being arrogant
**LENGTH**: 3-4 paragraphs, approximately 250-350 words
**STYLE**: Avoid clichés, use active voice, be specific and quantifiable

Generate only the cover letter content without any preamble or explanation."""

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

# Global instance
prompt_builder = AdvancedPromptBuilder()
