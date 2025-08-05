"""
Lightweight Intelligent Selection Pipeline for Job Application Assistant V2

This module implements a simplified version of intelligent selection using only spaCy
without requiring scikit-learn, for environments where C++ build tools are not available.
"""

import spacy
import re
from typing import Dict, List, Tuple, Any
import logging
from dataclasses import dataclass
from collections import Counter
import math

logger = logging.getLogger(__name__)

@dataclass
class JobAnalysis:
    """Structured analysis of job description requirements."""
    required_skills: List[str]
    key_concepts: List[str]
    required_experience_years: int
    company_name: str
    job_title: str
    key_responsibilities: List[str]

@dataclass
class ProfileAsset:
    """A scored user profile asset (project or experience)."""
    title: str
    description: str
    score: float
    matching_skills: List[str]
    matching_concepts: List[str]

class IntelligentSelectorLite:
    """
    Lightweight intelligent selection pipeline using only spaCy for NLP.
    """
    
    def __init__(self):
        self.nlp = None
        self.tech_skills = [
            # Programming Languages (ordered by specificity)
            "python", "javascript", "typescript", "java", "kotlin", "scala", "swift", 
            "c++", "c#", "objective-c", "go", "rust", "php", "ruby", "r", "c",
            "matlab", "sql", "html", "css", "xml", "json", "yaml",
            
            # Frameworks & Libraries
            "react", "angular", "vue.js", "vue", "node.js", "express.js", "express", 
            "django", "flask", "fastapi", "spring boot", "spring", "laravel", "rails",
            "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "matplotlib", 
            "seaborn", "plotly", "d3.js", "jquery", "bootstrap", "tailwind",
            
            # Databases
            "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra", 
            "dynamodb", "sqlite", "oracle", "sql server", "mariadb",
            
            # Cloud & DevOps
            "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "jenkins", 
            "github actions", "gitlab ci", "terraform", "ansible", "nginx", "apache", 
            "linux", "ubuntu", "centos", "debian", "windows server",
            
            # Tools & Platforms
            "git", "github", "gitlab", "bitbucket", "jira", "confluence", "slack", 
            "microsoft teams", "visual studio", "vscode", "intellij", "eclipse", 
            "jupyter", "postman", "insomnia", "figma", "sketch", "adobe"
        ]
        
        # Business and soft skill concepts
        self.business_concepts = [
            "leadership", "management", "teamwork", "collaboration", "communication", "problem solving",
            "project management", "agile", "scrum", "kanban", "stakeholder management", "strategy",
            "analysis", "research", "documentation", "presentation", "mentoring", "coaching"
        ]
        
    def initialize(self):
        """Initialize the spaCy NLP model."""
        try:
            if self.nlp is None:
                self.nlp = spacy.load("en_core_web_sm")
                logger.info("spaCy English model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load spaCy model: {e}")
            return False
    
    def analyze_job_description(self, job_description: str) -> JobAnalysis:
        """
        Analyze job description to extract key requirements.
        
        Args:
            job_description: Raw job description text
            
        Returns:
            JobAnalysis object with extracted information
        """
        if not self.initialize():
            # Fallback basic analysis if spaCy fails
            return self._basic_job_analysis(job_description)
        
        doc = self.nlp(job_description)
        
        # Extract skills
        required_skills = self._extract_skills(job_description.lower())
        
        # Extract key concepts using entities and noun phrases
        key_concepts = self._extract_key_concepts(doc)
        
        # Extract experience requirements
        experience_years = self._extract_experience_years(job_description)
        
        # Extract company name and job title
        company_name = self._extract_company_name(doc)
        job_title = self._extract_job_title(job_description)
        
        # Extract responsibilities
        responsibilities = self._extract_responsibilities(job_description)
        
        return JobAnalysis(
            required_skills=required_skills,
            key_concepts=key_concepts,
            required_experience_years=experience_years,
            company_name=company_name,
            job_title=job_title,
            key_responsibilities=responsibilities
        )
    
    def _basic_job_analysis(self, job_description: str) -> JobAnalysis:
        """Basic fallback analysis without spaCy."""
        text_lower = job_description.lower()
        
        # Extract skills using context-aware matching
        required_skills = [skill for skill in self.tech_skills 
                         if self._is_skill_mentioned(skill, text_lower)]
        
        # Extract basic concepts
        key_concepts = [concept for concept in self.business_concepts 
                       if concept.lower() in text_lower]
        
        # Extract experience
        experience_years = self._extract_experience_years(job_description)
        
        return JobAnalysis(
            required_skills=required_skills,
            key_concepts=key_concepts,
            required_experience_years=experience_years,
            company_name="",
            job_title="",
            key_responsibilities=[]
        )
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract technical skills from text using word boundary detection."""
        found_skills = []
        for skill in self.tech_skills:
            if self._is_skill_mentioned(skill, text):
                found_skills.append(skill)
        return list(set(found_skills))  # Remove duplicates
    
    def _is_skill_mentioned(self, skill: str, text: str) -> bool:
        """Check if a skill is mentioned in context, not just as substring."""
        skill_lower = skill.lower()
        text_lower = text.lower()
        
        # Special handling for problematic single-letter and short skills
        if skill_lower in ['r', 'c', 'go']:
            return self._check_programming_language_context(skill_lower, text_lower)
        
        # For multi-word skills (e.g., "node.js", "github actions")
        if ' ' in skill_lower or '.' in skill_lower:
            return skill_lower in text_lower
        
        # For regular skills, use word boundary matching
        pattern = r'\b' + re.escape(skill_lower) + r'\b'
        return bool(re.search(pattern, text_lower))
    
    def _check_programming_language_context(self, language: str, text: str) -> bool:
        """Check if short language names appear in programming context."""
        language_patterns = {
            'r': [
                r'\br\s+(?:programming|language|script|statistical|data|analysis)',
                r'(?:programming|language|statistical|data)\s+(?:with\s+)?r\b',
                r'\br\s+(?:studio|packages|cran)',
                r'(?:ggplot|dplyr|tidyverse|shiny).*r\b',
                r'\br\b.*(?:statistical|analytics|visualization)',
                r'(?:experience|proficient|skilled)\s+(?:in\s+)?r\b',
                r'\br\s+(?:/|and|or)\s+python',
                r'python\s+(?:/|and|or)\s+r\b'
            ],
            'c': [
                r'\bc\s+(?:programming|language)',
                r'(?:programming|language)\s+(?:in\s+)?c\b',
                r'\bc\s+(?:/|and|or)\s+c\+\+',
                r'c\+\+\s+(?:/|and|or)\s+c\b',
                r'(?:experience|proficient|skilled)\s+(?:in\s+)?c\b',
                r'\bc\s+(?:development|coding)',
                r'(?:embedded|system)\s+(?:programming\s+)?(?:in\s+)?c\b'
            ],
            'go': [
                r'\bgo\s+(?:programming|language|lang)',
                r'(?:programming|language)\s+(?:in\s+)?go\b',
                r'golang\b',
                r'\bgo\s+(?:development|coding)',
                r'(?:experience|proficient|skilled)\s+(?:in\s+)?go\b',
                r'\bgo\s+(?:/|and|or)\s+(?:python|java|rust)',
                r'(?:python|java|rust)\s+(?:/|and|or)\s+go\b',
                r'google\s+go\b'
            ]
        }
        
        if language in language_patterns:
            for pattern in language_patterns[language]:
                if re.search(pattern, text):
                    return True
        
        return False
    
    def _extract_key_concepts(self, doc) -> List[str]:
        """Extract key concepts using spaCy entities and noun phrases."""
        concepts = []
        
        # Add named entities
        for ent in doc.ents:
            if ent.label_ in ["ORG", "PRODUCT", "WORK_OF_ART", "LANGUAGE"]:
                concepts.append(ent.text.lower())
        
        # Add important noun phrases
        for chunk in doc.noun_chunks:
            if 2 <= len(chunk.text.split()) <= 4:  # 2-4 word phrases
                concepts.append(chunk.text.lower())
        
        # Add business concepts
        text_lower = doc.text.lower()
        for concept in self.business_concepts:
            if concept.lower() in text_lower:
                concepts.append(concept)
        
        return list(set(concepts))[:20]  # Limit to top 20
    
    def _extract_experience_years(self, text: str) -> int:
        """Extract required years of experience."""
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'(\d+)\+?\s*years?\s*in',
            r'minimum\s*(?:of\s*)?(\d+)\s*years?',
            r'at\s*least\s*(\d+)\s*years?'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text.lower())
            if matches:
                return int(matches[0])
        return 0
    
    def _extract_company_name(self, doc) -> str:
        """Extract company name from job description."""
        for ent in doc.ents:
            if ent.label_ == "ORG":
                return ent.text
        return ""
    
    def _extract_job_title(self, text: str) -> str:
        """Extract job title from description."""
        lines = text.split('\n')
        if lines:
            # Often the first line contains the job title
            first_line = lines[0].strip()
            if len(first_line) < 100:  # Reasonable title length
                return first_line
        return ""
    
    def _extract_responsibilities(self, text: str) -> List[str]:
        """Extract key responsibilities from job description."""
        responsibilities = []
        
        # Look for bullet points or numbered lists
        bullet_patterns = [
            r'[•·-]\s*(.+?)(?=\n|$)',
            r'\d+\.\s*(.+?)(?=\n|$)',
            r'^\s*[\*-]\s*(.+?)(?=\n|$)'
        ]
        
        for pattern in bullet_patterns:
            matches = re.findall(pattern, text, re.MULTILINE)
            responsibilities.extend(matches)
        
        return responsibilities[:10]  # Limit to top 10
    
    def calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity between two texts using simple word overlap.
        This is a lightweight alternative to TF-IDF cosine similarity.
        """
        # Simple tokenization and cleaning
        words1 = set(re.findall(r'\b\w+\b', text1.lower()))
        words2 = set(re.findall(r'\b\w+\b', text2.lower()))
        
        if not words1 or not words2:
            return 0.0
        
        # Calculate Jaccard similarity (intersection over union)
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0
    
    def rank_profile_assets(self, job_analysis: JobAnalysis, user_profile: Dict[str, Any]) -> List[ProfileAsset]:
        """
        Rank user profile assets based on relevance to job requirements.
        
        Args:
            job_analysis: Analyzed job requirements
            user_profile: User's profile data
            
        Returns:
            List of ranked ProfileAsset objects
        """
        ranked_assets = []
        
        # Combine projects and experiences
        all_assets = []
        
        # Process projects
        if 'projects' in user_profile:
            projects = user_profile['projects']
            if isinstance(projects, str):
                # If projects is a string, treat it as one project
                all_assets.append({
                    'title': 'Project',
                    'description': projects,
                    'type': 'project'
                })
            elif isinstance(projects, list):
                for project in projects:
                    if isinstance(project, dict):
                        all_assets.append({
                            'title': project.get('title', project.get('name', 'Project')),
                            'description': project.get('description', str(project)),
                            'type': 'project'
                        })
                    else:
                        # If project is a string or other type
                        all_assets.append({
                            'title': 'Project',
                            'description': str(project),
                            'type': 'project'
                        })
        
        # Process experiences
        if 'experiences' in user_profile:
            experiences = user_profile['experiences']
            if isinstance(experiences, str):
                # If experiences is a string, treat it as one experience
                all_assets.append({
                    'title': 'Experience',
                    'description': experiences,
                    'type': 'experience'
                })
            elif isinstance(experiences, list):
                for exp in experiences:
                    if isinstance(exp, dict):
                        all_assets.append({
                            'title': exp.get('position', exp.get('title', exp.get('role', 'Experience'))),
                            'description': exp.get('description', str(exp)),
                            'type': 'experience'
                        })
                    else:
                        # If experience is a string or other type
                        all_assets.append({
                            'title': 'Experience',
                            'description': str(exp),
                            'type': 'experience'
                        })
        
        # Score each asset
        for asset in all_assets:
            score = self._calculate_asset_score(asset, job_analysis)
            matching_skills = self._find_matching_skills(asset['description'], job_analysis.required_skills)
            matching_concepts = self._find_matching_concepts(asset['description'], job_analysis.key_concepts)
            
            ranked_assets.append(ProfileAsset(
                title=asset['title'],
                description=asset['description'],
                score=score,
                matching_skills=matching_skills,
                matching_concepts=matching_concepts
            ))
        
        # Sort by score (highest first)
        ranked_assets.sort(key=lambda x: x.score, reverse=True)
        
        return ranked_assets
    
    def _calculate_asset_score(self, asset: Dict[str, Any], job_analysis: JobAnalysis) -> float:
        """Calculate relevance score for a profile asset."""
        title = asset.get('title', '')
        description = asset.get('description', '')
        combined_text = f"{title} {description}".lower()
        
        score = 0.0
        
        # Score based on skill matches (using context-aware matching)
        for skill in job_analysis.required_skills:
            if self._is_skill_mentioned(skill, combined_text):
                score += 2.0  # High weight for exact skill matches
        
        # Score based on concept matches
        for concept in job_analysis.key_concepts:
            if concept.lower() in combined_text:
                score += 1.0
        
        # Score based on overall text similarity
        job_text = f"{' '.join(job_analysis.required_skills)} {' '.join(job_analysis.key_concepts)}"
        similarity_score = self.calculate_text_similarity(combined_text, job_text)
        score += similarity_score * 3.0  # Weight similarity
        
        # Normalize score to 0-10 scale
        max_possible_score = len(job_analysis.required_skills) * 2.0 + len(job_analysis.key_concepts) * 1.0 + 3.0
        if max_possible_score > 0:
            normalized_score = (score / max_possible_score) * 10.0
        else:
            normalized_score = 0.0
        
        return min(normalized_score, 10.0)  # Cap at 10.0
    
    def _find_matching_skills(self, text: str, required_skills: List[str]) -> List[str]:
        """Find which required skills match in the text using context-aware matching."""
        return [skill for skill in required_skills if self._is_skill_mentioned(skill, text)]
    
    def _find_matching_concepts(self, text: str, key_concepts: List[str]) -> List[str]:
        """Find which key concepts match in the text."""
        text_lower = text.lower()
        return [concept for concept in key_concepts if concept.lower() in text_lower]
    
    def select_best_assets(self, ranked_assets: List[ProfileAsset], max_assets: int = 5) -> List[ProfileAsset]:
        """Select the best assets based on scores."""
        return ranked_assets[:max_assets]

# Create global instance
intelligent_selector_lite = IntelligentSelectorLite()
