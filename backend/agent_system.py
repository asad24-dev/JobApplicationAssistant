"""
Multi-Step AI Agent System for Job Application Assistant V3
"""

import asyncio
from typing import Dict, List, Any
from dataclasses import dataclass
from intelligent_selection_lite import JobAnalysis, ProfileAsset
import logging

logger = logging.getLogger(__name__)

@dataclass
class AgentContext:
    """Context passed between agents."""
    job_description: str
    user_profile: Dict[str, Any]
    job_analysis: JobAnalysis
    selected_assets: List[ProfileAsset]
    research_findings: Dict[str, Any] = None
    narrative_strategy: Dict[str, Any] = None
    final_content: str = None

class ResearchAgent:
    """Agent focused on company research and culture analysis."""
    
    def __init__(self, llm_client):
        self.llm = llm_client
    
    async def analyze_company(self, context: AgentContext) -> Dict[str, Any]:
        """Research company culture, values, and recent developments."""
        
        research_prompt = f"""You are a company research specialist. Analyze this job description to extract deep insights about the company's culture, values, and strategic priorities.

JOB DESCRIPTION:
{context.job_description}

COMPANY: {context.job_analysis.company_name}

Extract and provide:
1. **Company Values**: What values does this company prioritize? (innovation, collaboration, customer-focus, etc.)
2. **Culture Indicators**: What kind of work environment and team dynamics do they promote?
3. **Strategic Priorities**: What are their key business challenges and goals?
4. **Language Style**: How formal/casual is their communication style?
5. **What They're Looking For**: Beyond skills, what personality traits and mindset do they value?

Format as JSON with these keys: values, culture, priorities, style, ideal_candidate_traits"""

        try:
            response = await self.llm.generate_content(research_prompt)
            # Parse JSON response
            import json
            research_data = json.loads(response.text)
            return research_data
        except Exception as e:
            logger.error(f"Research agent failed: {e}")
            return {
                "values": ["innovation", "collaboration"],
                "culture": "fast-paced, collaborative environment",
                "priorities": "growth and customer satisfaction",
                "style": "professional yet approachable",
                "ideal_candidate_traits": ["proactive", "analytical", "team-player"]
            }

class StrategyAgent:
    """Agent focused on narrative strategy and positioning."""
    
    def __init__(self, llm_client):
        self.llm = llm_client
    
    async def develop_strategy(self, context: AgentContext) -> Dict[str, Any]:
        """Develop strategic narrative positioning."""
        
        strategy_prompt = f"""You are a career strategist. Based on the company research and candidate profile, develop a strategic narrative approach.

COMPANY INSIGHTS:
{context.research_findings}

CANDIDATE PROFILE:
Name: {context.user_profile.get('fullName', 'Candidate')}
Summary: {context.user_profile.get('summary', '')}
Key Experience: {context.selected_assets[0].description if context.selected_assets else 'No specific experience highlighted'}

ROLE: {context.job_analysis.job_title}

Develop a strategy that answers:
1. **Unique Value Prop**: What makes this candidate uniquely valuable for THIS company?
2. **Story Arc**: What's the compelling narrative thread connecting their background to this role?
3. **Emotional Hook**: What personal connection can we establish with the company's mission?
4. **Differentiation**: How do we position them differently from other candidates?
5. **Proof Points**: What specific examples best demonstrate their fit?

Format as JSON with these keys: unique_value, story_arc, emotional_hook, differentiation, proof_points"""

        try:
            response = await self.llm.generate_content(strategy_prompt)
            import json
            strategy_data = json.loads(response.text)
            return strategy_data
        except Exception as e:
            logger.error(f"Strategy agent failed: {e}")
            return {
                "unique_value": "Strong technical background with business acumen",
                "story_arc": "From individual contributor to team leader",
                "emotional_hook": "Passion for solving meaningful problems",
                "differentiation": "Unique combination of technical and soft skills",
                "proof_points": ["Led successful project", "Collaborated effectively"]
            }

class WriterAgent:
    """Agent focused on crafting compelling, human narratives."""
    
    def __init__(self, llm_client):
        self.llm = llm_client
    
    async def write_cover_letter(self, context: AgentContext) -> str:
        """Write the final cover letter based on research and strategy."""
        
        writing_prompt = f"""You are an award-winning professional writer specializing in executive communications. Write a compelling cover letter that feels authentically human.

COMPANY: {context.job_analysis.company_name}
ROLE: {context.job_analysis.job_title}

RESEARCH INSIGHTS:
{context.research_findings}

STRATEGIC APPROACH:
{context.narrative_strategy}

CANDIDATE BACKGROUND:
{context.user_profile.get('summary', '')}

KEY EXPERIENCE:
{context.selected_assets[0].description if context.selected_assets else ''}

WRITING GUIDELINES:
- Open with a personal connection to the company's mission or recent achievement
- Tell a specific story that demonstrates value alignment
- Show genuine enthusiasm without being generic
- End with a confident but humble invitation for conversation
- 280-320 words, conversational professional tone
- NO bullet points, dashes, or formatting
- Sound like a real person, not a template

Write the cover letter now:"""

        try:
            response = await self.llm.generate_content(writing_prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Writer agent failed: {e}")
            return "Error generating cover letter. Please try again."

class AgentOrchestrator:
    """Orchestrates the multi-agent workflow."""
    
    def __init__(self, llm_client):
        self.research_agent = ResearchAgent(llm_client)
        self.strategy_agent = StrategyAgent(llm_client)
        self.writer_agent = WriterAgent(llm_client)
    
    async def generate_cover_letter(self, context: AgentContext) -> str:
        """Run the complete agent workflow."""
        
        # Step 1: Research
        logger.info("Agent 1: Researching company culture and values...")
        context.research_findings = await self.research_agent.analyze_company(context)
        
        # Step 2: Strategy
        logger.info("Agent 2: Developing narrative strategy...")
        context.narrative_strategy = await self.strategy_agent.develop_strategy(context)
        
        # Step 3: Writing
        logger.info("Agent 3: Crafting final cover letter...")
        context.final_content = await self.writer_agent.write_cover_letter(context)
        
        return context.final_content

# For synchronous usage (current implementation)
class SyncAgentOrchestrator:
    """Synchronous version for current FastAPI setup."""
    
    def __init__(self, llm_client):
        self.llm = llm_client
    
    def generate_cover_letter(self, context: AgentContext) -> str:
        """Synchronous multi-step generation."""
        
        # Step 1: Research
        research_prompt = f"""Analyze this company and extract: values, culture, priorities, communication style.

{context.job_description}

Company: {context.job_analysis.company_name}

Respond in this format:
VALUES: [list key values]
CULTURE: [describe work environment] 
PRIORITIES: [main business goals]
STYLE: [communication style]"""

        research_response = self.llm.generate_content(research_prompt)
        
        # Step 2: Strategy
        strategy_prompt = f"""Based on this research and candidate profile, what's the best narrative strategy?

RESEARCH: {research_response.text}
CANDIDATE: {context.user_profile.get('summary', '')}
TOP EXPERIENCE: {context.selected_assets[0].description if context.selected_assets else ''}

Provide:
UNIQUE VALUE: [what makes them special]
STORY ARC: [narrative thread]
EMOTIONAL HOOK: [personal connection]
PROOF POINTS: [best examples]"""

        strategy_response = self.llm.generate_content(strategy_prompt)
        
        # Step 3: Writing
        writing_prompt = f"""Write a compelling, human cover letter using this strategy:

RESEARCH: {research_response.text}
STRATEGY: {strategy_response.text}
COMPANY: {context.job_analysis.company_name}
ROLE: {context.job_analysis.job_title}

Make it conversational, personal, and authentic. No formatting. 280-320 words."""

        final_response = self.llm.generate_content(writing_prompt)
        return final_response.text.strip()
    
    def generate_questions(self, context: AgentContext) -> str:
        """Generate application questions using simplified agent approach."""
        
        # For questions, use a simplified single-step approach
        questions_list = context.user_profile.get('questions', '').split('|') if context.user_profile.get('questions') else [
            "Why are you interested in this position?",
            "What makes you a good fit for this role?", 
            "Describe your relevant experience."
        ]
        
        questions_prompt = f"""Based on this candidate profile and job analysis, provide excellent answers to application questions.

COMPANY: {context.job_analysis.company_name}
ROLE: {context.job_analysis.job_title}
CANDIDATE: {context.user_profile.get('summary', '')}

QUESTIONS:
{chr(10).join(f"{i+1}. {q.strip()}" for i, q in enumerate(questions_list))}

TOP RELEVANT EXPERIENCE:
{context.selected_assets[0].description if context.selected_assets else 'General background'}

Provide compelling, specific answers that demonstrate value alignment. Use STAR method for behavioral questions. Be authentic and avoid generic responses.

Format: Question 1: [question] Answer: [detailed response]"""

        response = self.llm.generate_content(questions_prompt)
        return response.text.strip()
