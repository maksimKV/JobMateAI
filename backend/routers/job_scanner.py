from fastapi import APIRouter, HTTPException, Body, Request, status
from typing import Dict, Any, List, Set, Optional
import re
import logging
import json

from utils.ai_client import ai_client
from routers.cv_analyzer import cv_storage
from utils.file_parser import FileParser
from utils.translations import translator

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Job Scanner"])

def extract_skills_from_text(job_info: Dict[str, Any]) -> Dict[str, List[str]]:
    """
    Extract skills from the job info dictionary structure or raw text.
    
    Args:
        job_info: Dictionary containing job information with 'raw_text' key
        
    Returns:
        Dictionary with categorized skills (technical, soft, etc.)
    """
    logger.info("Extracting skills from job info")
    skills = set()
    tech_skills = set()
    soft_skills = set()
    
    # Common technical terms to look for
    tech_keywords = [
        'html', 'css', 'javascript', 'typescript', 'react', 'node', 'bootstrap', 
        'aws', 'python', 'java', 'c#', 'c++', 'sql', 'nosql', 'mongodb', 'postgresql',
        'mysql', 'git', 'docker', 'kubernetes', 'rest', 'api', 'graphql', 'grpc',
        'microservices', 'mvc', 'mvvm', 'oop', 'design patterns', 'agile', 'scrum',
        'ci/cd', 'tdd', 'jest', 'mocha', 'junit', 'selenium', 'jenkins', 'github actions',
        'azure', 'google cloud', 'firebase', 'heroku', 'netlify', 'vercel', 'django',
        'flask', 'express', 'spring boot', 'asp.net', 'ruby on rails', 'laravel',
        'symfony', 'angular', 'vue', 'svelte', 'jquery', 'redux', 'mobx', 'apollo',
        'webpack', 'babel', 'eslint', 'prettier', 'flow', 'jasmine', 'cypress',
        'storybook', 'styled components', 'tailwind css', 'sass', 'less', 'bem',
        'terraform', 'ansible', 'chef', 'puppet', 'circleci', 'gitlab ci',
        'travis ci', 'aws codepipeline', 'azure devops', 'google cloud build',
        'serverless', 'aws lambda', 'google cloud functions', 'azure functions',
        'firebase functions', 'netlify functions', 'websockets', 'webrtc', 'oauth',
        'jwt', 'openid connect', 'saml', 'ldap', 'oidc', 'api gateway', 'kong',
        'apollo server', 'hasura', 'prisma', 'redis', 'elasticsearch', 'dynamodb',
        'firestore', 'bigquery', 'snowflake', 'redshift', 'tableau', 'power bi',
        'looker', 'metabase', 'apache kafka', 'rabbitmq', 'nats', 'protobuf'
    ]
    
    # Common soft skills to look for
    soft_skill_keywords = [
        'communication', 'teamwork', 'leadership', 'problem-solving', 'critical thinking',
        'adaptability', 'time management', 'creativity', 'emotional intelligence',
        'conflict resolution', 'collaboration', 'active listening', 'empathy', 'patience',
        'flexibility', 'work ethic', 'responsibility', 'dependability', 'self-motivation',
        'professionalism', 'initiative', 'decision making', 'stress management',
        'organization', 'attention to detail', 'multitasking', 'networking', 'negotiation',
        'presentation', 'public speaking', 'writing', 'research', 'analysis', 'planning',
        'delegation', 'mentoring', 'coaching', 'training', 'supervision', 'project management',
        'strategic thinking', 'innovation', 'resourcefulness', 'persuasion', 'influence',
        'diplomacy', 'tact', 'cultural awareness', 'customer service', 'sales', 'marketing',
        'business development', 'financial management', 'risk management', 'quality assurance',
        'compliance', 'regulatory', 'legal', 'ethics', 'diversity', 'inclusion', 'equity',
        'belonging', 'accessibility', 'sustainability', 'corporate social responsibility'
    ]
    
    # Try to extract from structured data first
    if isinstance(job_info, dict):
        # Get all text content from the job info
        all_text = []
        if 'job_description' in job_info and isinstance(job_info['job_description'], str):
            all_text.append(job_info['job_description'].lower())
        if 'description' in job_info and isinstance(job_info['description'], str):
            all_text.append(job_info['description'].lower())
        
        # Search for technical skills in the text
        for text in all_text:
            for keyword in tech_keywords:
                if keyword in text:
                    tech_skills.add(keyword.upper() if len(keyword) <= 3 else keyword.title())
            
            # Search for soft skills in the text
            for skill in soft_skill_keywords:
                if skill in text:
                    soft_skills.add(skill.title())
    
    # Convert sets to lists and return
    return {
        "skills": list(tech_skills),  # All technical skills go here for now
        "technologies": list(tech_skills),
        "soft_skills": list(soft_skills)
    }

def calculate_match_score(job_skills: Dict[str, List[str]], cv_skills: Dict[str, List[str]]) -> float:
    """
    Calculate match score between job requirements and CV skills.
    
    Args:
        job_skills: Dictionary of skills from job description
        cv_skills: Dictionary of skills from CV
        
    Returns:
        Match score as a float between 0 and 100
    """
    if not job_skills or not cv_skills:
        return 0.0

    # Normalize skills to lowercase for case-insensitive comparison
    job_skills_set = set(skill.lower() for skill in job_skills.get("skills", []))
    cv_skills_set = set(skill.lower() for skill in cv_skills.get("skills", []))

    # Calculate match score
    match_score = int(100 * len(job_skills_set & cv_skills_set) / max(1, len(job_skills_set)))

    return match_score

def generate_improvement_suggestions(job_skills: Dict[str, List[str]], cv_skills: Dict[str, List[str]], language: str) -> Dict[str, Any]:
    """
    Generate improvement suggestions based on job requirements and CV skills.
    
    Args:
        job_skills: Dictionary of skills from job description
        cv_skills: Dictionary of skills from CV
        language: Language code for the response
        
    Returns:
        Dictionary containing improvement suggestions
    """
    suggestions = {}

    # 1. Skills to add
    missing_skills = list(set(skill.lower() for skill in job_skills.get("skills", [])) - set(skill.lower() for skill in cv_skills.get("skills", [])))
    if missing_skills:
        suggestions["missing_skills"] = [{"text": skill, "action": "add"} for skill in missing_skills[:5]]

    # 2. Skills to highlight
    matched_skills = list(set(skill.lower() for skill in job_skills.get("skills", [])) & set(skill.lower() for skill in cv_skills.get("skills", [])))
    if matched_skills:
        suggestions["matched_skills"] = [{"text": skill, "action": "highlight"} for skill in matched_skills[:5]]

    return suggestions

def get_score_interpretation(match_score: float, language: str) -> str:
    """
    Get score interpretation based on match score and language.
    
    Args:
        match_score: Match score as a float between 0 and 100
        language: Language code for the response
        
    Returns:
        Score interpretation as a string
    """
    if match_score < 50:
        return translator.get("score_interpretation.low", language)
    elif match_score < 80:
        return translator.get("score_interpretation.medium", language)
    else:
        return translator.get("score_interpretation.high", language)

@router.post("/match")
async def job_match(
    request: Request,
    cv_id: str = Body(..., embed=True, description="ID of the uploaded CV"),
    job_description: str = Body(..., embed=True, description="Job description text to analyze"),
    language: Optional[str] = Body(None, embed=True, description="Language code for the response (e.g., 'en', 'bg')")
) -> Dict[str, Any]:
    """
    Extract keywords from job description, compare to CV, and return match analysis.
    
    Args:
        cv_id: ID of the uploaded CV to compare against
        job_description: Job description text to analyze
        language: Language code for the response (e.g., 'en', 'bg')
        
    Returns:
        Dictionary containing job match analysis
    """
    # Get language from request if not provided
    req_language = getattr(request.state, 'language', 'en')
    language = language or req_language
    
    if not cv_id or not job_description.strip():
        error_msg = translator.get("errors.missing_required_fields", language)
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    if cv_id not in cv_storage:
        error_msg = translator.get("errors.cv_not_found", language, cv_id=cv_id)
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_msg
        )

    try:
        # Extract skills from job description
        job_skills = extract_skills_from_text({"raw_text": job_description})
        
        # Get skills from CV
        cv_data = cv_storage[cv_id]
        cv_skills = cv_data.get("skills", {})
        
        # Calculate match score
        match_score = calculate_match_score(job_skills, cv_skills)
        
        # Generate improvement suggestions
        suggestions = generate_improvement_suggestions(job_skills, cv_skills, language)
        
        # Prepare response
        response = {
            "success": True,
            "message": translator.get("success.job_match_completed", language),
            "match_score": match_score,
            "job_skills": job_skills,
            "cv_skills": cv_skills,
            "suggestions": suggestions,
            "missing_skills": suggestions.get("missing_skills", []),
            "language": language
        }
        
        # Add localized score interpretation
        score_interpretation = get_score_interpretation(match_score, language)
        response["score_interpretation"] = score_interpretation
        
        return response
    except Exception as e:
        logger.error(f"Error matching job: {str(e)}", exc_info=True)
        error_msg = translator.get(
            "errors.job_match_failed", 
            language, 
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )