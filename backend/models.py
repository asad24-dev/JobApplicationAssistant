from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum

class ContentType(str, Enum):
    """Supported content generation types."""
    COVER_LETTER = "cover_letter"
    QUESTIONS = "questions"

class UserProfile(BaseModel):
    """User profile data model."""
    fullName: str = Field(..., description="User's full name")
    email: str = Field(..., description="User's email address")
    phone: Optional[str] = Field(None, description="User's phone number")
    location: Optional[str] = Field(None, description="User's location")
    linkedinUrl: Optional[str] = Field(None, description="User's LinkedIn profile URL")
    summary: Optional[str] = Field(None, description="Professional summary")
    experience: Optional[str] = Field(None, description="Work experience details")
    education: Optional[str] = Field(None, description="Education background")
    skills: Optional[str] = Field(None, description="Technical and soft skills")
    projects: Optional[str] = Field(None, description="Notable projects")
    degree: Optional[str] = Field(None, description="Primary degree")
    university: Optional[str] = Field(None, description="University attended")

class ApplicationData(BaseModel):
    """Complete application data for processing."""
    user_profile: UserProfile = Field(..., description="User's profile information")
    job_description: str = Field(..., description="Target job description")
    content_type: ContentType = Field(ContentType.COVER_LETTER, description="Type of content to generate")
    questions: Optional[str] = Field(None, description="Application questions to answer (required for 'questions' type)")

class GenerationResponse(BaseModel):
    """Response model for generated content."""
    generated_content: str = Field(..., description="The AI-generated content")
    content_type: ContentType = Field(..., description="Type of generated content")
    success: bool = Field(True, description="Whether generation was successful")
    processing_time: float = Field(..., description="Time taken to generate content in seconds")
    token_usage: Optional[Dict[str, int]] = Field(None, description="Token usage statistics")
    
class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    success: bool = Field(False, description="Always false for errors")

class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = Field("healthy", description="Service status")
    version: str = Field("1.0.0", description="API version")
    timestamp: str = Field(..., description="Current timestamp")
