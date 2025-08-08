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

def normalize_skills(skills: List[str]) -> Set[str]:
    """Normalize skills for case-insensitive comparison and remove duplicates."""
    normalized = set()
    for skill in skills:
        if not skill or not isinstance(skill, str):
            continue
        # Convert to lowercase and remove extra whitespace
        normalized_skill = ' '.join(skill.lower().strip().split())
        if normalized_skill:  # Only add non-empty strings
            normalized.add(normalized_skill)
    return normalized

def calculate_match_score(job_skills: Dict[str, List[str]], cv_skills: Dict[str, List[str]]) -> float:
    """
    Calculate match score between job requirements and CV skills.
    
    Args:
        job_skills: Dictionary of skills from job description with keys like 'skills', 'technologies', 'soft_skills'
        cv_skills: Dictionary of skills from CV with the same keys
        
    Returns:
        Match score as a float between 0 and 100
    """
    if not job_skills or not cv_skills:
        logger.warning("Empty job_skills or cv_skills provided to calculate_match_score")
        return 0.0
    
    # Normalize all skills for case-insensitive comparison and remove duplicates
    job_skills_normalized = {}
    cv_skills_normalized = {}
    
    # Process job skills
    for category, skills in job_skills.items():
        if not skills or not isinstance(skills, list):
            job_skills_normalized[category] = set()
            continue
        job_skills_normalized[category] = normalize_skills(skills)
    
    # Process CV skills
    for category in job_skills.keys():  # Only check categories that exist in job_skills
        cv_category_skills = cv_skills.get(category, [])
        if not cv_category_skills or not isinstance(cv_category_skills, list):
            cv_skills_normalized[category] = set()
            continue
        cv_skills_normalized[category] = normalize_skills(cv_category_skills)
    
    # Calculate match for each skill category
    total_required = 0
    total_matched = 0
    
    for category, required_skills in job_skills_normalized.items():
        if not required_skills:
            logger.debug(f"No required skills in category: {category}")
            continue
            
        cv_category_skills = cv_skills_normalized.get(category, set())
        matched_skills = required_skills.intersection(cv_category_skills)
        matched_count = len(matched_skills)
        
        # Log detailed matching information
        if matched_count < len(required_skills):
            missing_skills = required_skills - matched_skills
            logger.info(f"Missing {len(missing_skills)}/{len(required_skills)} skills in category '{category}': {', '.join(missing_skills)}")
        
        total_required += len(required_skills)
        total_matched += matched_count
    
    # Avoid division by zero
    if total_required == 0:
        logger.warning("No required skills found in job description")
        return 0.0
        
    # Calculate percentage match
    match_percentage = (total_matched / total_required) * 100
    logger.info(f"Match calculation - Required: {total_required}, Matched: {total_matched}, Percentage: {match_percentage:.2f}%")
    
    return round(match_percentage, 2)

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
    job_description: Any = Body(..., embed=True, description="Job description text or structured data to analyze"),
    language: Optional[str] = Body(None, embed=True, description="Language code for the response (e.g., 'en', 'bg')")
) -> Dict[str, Any]:
    """
    Extract keywords from job description, compare to CV, and return match analysis.
    
    Args:
        cv_id: ID of the uploaded CV to compare against
        job_description: Job description text or structured data to analyze
        language: Language code for the response (e.g., 'en', 'bg')
        
    Returns:
        Dictionary containing job match analysis
    """
    # Get language from request if not provided
    req_language = getattr(request.state, 'language', 'en')
    language = language or req_language
    
    if not cv_id or not job_description or (isinstance(job_description, str) and not job_description.strip()):
        error_msg = translator.get("errors.missing_required_fields", language)
        logger.error(f"Missing required fields - cv_id: {bool(cv_id)}, job_description: {bool(job_description)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    if cv_id not in cv_storage:
        error_msg = translator.get("errors.cv_not_found", language, cv_id=cv_id)
        logger.error(f"CV not found - cv_id: {cv_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_msg
        )

    try:
        # Log the type and content of job_description for debugging
        logger.info(f"Job description type: {type(job_description)}")
        if isinstance(job_description, str):
            logger.info(f"Job description length: {len(job_description)} characters")
        else:
            logger.info(f"Job description structure: {json.dumps(job_description, indent=2)[:500]}...")

        # Extract skills from job description (handle both string and dict inputs)
        job_skills = extract_skills_from_text(job_description if isinstance(job_description, dict) else {"raw_text": job_description})
        
        # Get skills from CV with validation
        cv_data = cv_storage[cv_id]
        cv_skills = cv_data.get("skills", {})
        
        # Log extracted skills for debugging
        logger.info(f"Extracted job skills: {json.dumps(job_skills, indent=2)}")
        logger.info(f"CV skills structure: {json.dumps(cv_skills, indent=2)[:1000]}...")
        
        # Validate CV skills structure
        if not isinstance(cv_skills, dict):
            logger.warning(f"Unexpected CV skills format: {type(cv_skills)}")
            cv_skills = {"skills": [], "technologies": [], "soft_skills": []}
        
        # Ensure all expected keys exist in cv_skills
        for key in ["skills", "technologies", "soft_skills"]:
            if key not in cv_skills:
                cv_skills[key] = []
                logger.warning(f"Missing key in CV skills: {key}")
        
        # Calculate match score with case-insensitive comparison
        match_score = calculate_match_score(job_skills, cv_skills)
        
        # Generate improvement suggestions
        suggestions = generate_improvement_suggestions(job_skills, cv_skills, language)
        
        # Log the match results for debugging
        logger.info(f"Match score: {match_score}")
        logger.info(f"Missing skills: {suggestions.get('missing_skills', [])}")
        
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