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
        
        # Teaching-specific skills and concepts
        self.teaching_skills = [
            "curriculum development", "lesson planning", "classroom management", "assessment", 
            "differentiated instruction", "educational technology", "student engagement",
            "learning objectives", "pedagogy", "educational psychology", "special needs",
            "inclusive education", "parent communication", "professional development"
        ]
        
        # Job category keywords
        self.job_categories = {
            'teaching': ['teacher', 'instructor', 'professor', 'educator', 'tutor', 'lecturer', 
                        'teaching', 'education', 'classroom', 'curriculum', 'student', 'school'],
            'healthcare': ['nurse', 'doctor', 'physician', 'medical', 'clinical', 'patient', 'hospital'],
            'technology': ['developer', 'engineer', 'programmer', 'software', 'technical', 'coding'],
            'business': ['manager', 'analyst', 'consultant', 'sales', 'marketing', 'finance'],
            'research': ['research', 'scientist', 'analyst', 'data', 'study', 'investigation']
        }
        
    def initialize(self):
        """Initialize the spaCy NLP model."""
        try:
            if self.nlp is None:
                # Try to load the model
                try:
                    self.nlp = spacy.load("en_core_web_sm")
                    logger.info("spaCy English model loaded successfully")
                except OSError:
                    # Model not found, try to download it
                    logger.warning("spaCy model not found, attempting to download...")
                    try:
                        import subprocess
                        subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"], 
                                     check=True, capture_output=True)
                        self.nlp = spacy.load("en_core_web_sm")
                        logger.info("spaCy English model downloaded and loaded successfully")
                    except Exception as download_error:
                        logger.error(f"Failed to download spaCy model: {download_error}")
                        logger.warning("Falling back to basic analysis without spaCy")
                        self.nlp = None
                        return True  # Continue with fallback mode
            return True
        except Exception as e:
            logger.error(f"Failed to initialize spaCy: {e}")
            logger.warning("Using fallback analysis mode")
            self.nlp = None
            return True  # Always return True to continue with fallback
    
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
        
        # Detect job category first
        job_category = self._detect_job_category(job_description.lower())
        
        if self.nlp:
            doc = self.nlp(job_description)
            
            # Extract skills based on job category
            required_skills = self._extract_skills_by_category(job_description.lower(), job_category)
            
            # Extract key concepts using entities and noun phrases
            key_concepts = self._extract_key_concepts(doc)
            
            # Extract company name and job title
            company_name = self._extract_company_name(doc)
            job_title = self._extract_job_title(job_description)
            
            # Extract responsibilities
            responsibilities = self._extract_responsibilities(job_description)
        else:
            # Fallback without spaCy
            required_skills = self._extract_skills_by_category(job_description.lower(), job_category)
            key_concepts = self._extract_basic_concepts(job_description.lower(), job_category)
            company_name = ""
            job_title = ""
            responsibilities = []
        
        # Extract experience requirements
        experience_years = self._extract_experience_years(job_description)
        
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
    
    def _detect_job_category(self, job_text: str) -> str:
        """Detect the primary job category based on keywords."""
        category_scores = {}
        
        for category, keywords in self.job_categories.items():
            score = sum(1 for keyword in keywords if keyword in job_text)
            category_scores[category] = score
        
        # Return category with highest score, default to 'business'
        if category_scores:
            return max(category_scores.items(), key=lambda x: x[1])[0]
        return 'business'
    
    def _extract_skills_by_category(self, text: str, job_category: str) -> List[str]:
        """Extract skills relevant to the specific job category."""
        found_skills = []
        
        # Always check technical skills but weight them by category
        for skill in self.tech_skills:
            if self._is_skill_mentioned(skill, text):
                # For teaching jobs, de-prioritize some technical skills
                if job_category == 'teaching' and skill in ['docker', 'kubernetes', 'aws', 'terraform']:
                    continue
                found_skills.append(skill)
        
        # Add category-specific skills
        if job_category == 'teaching':
            for skill in self.teaching_skills:
                skill_variants = [skill, skill.replace(' ', ''), skill.replace(' ', '-')]
                if any(variant in text for variant in skill_variants):
                    found_skills.append(skill)
        
        # Add relevant business concepts for all categories
        for concept in self.business_concepts:
            if concept.lower() in text:
                found_skills.append(concept)
        
        return list(set(found_skills))  # Remove duplicates
    
    def _extract_basic_concepts(self, text: str, job_category: str) -> List[str]:
        """Extract concepts when spaCy is not available."""
        concepts = []
        
        # Category-specific concepts
        if job_category == 'teaching':
            teaching_concepts = ['education', 'learning', 'students', 'curriculum', 'assessment', 
                               'classroom', 'instruction', 'pedagogy', 'academic']
            concepts.extend([concept for concept in teaching_concepts if concept in text])
        
        # General business concepts
        concepts.extend([concept for concept in self.business_concepts if concept in text])
        
        return list(set(concepts))[:10]  # Limit and remove duplicates
    
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
