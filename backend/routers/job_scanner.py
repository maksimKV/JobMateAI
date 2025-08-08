from fastapi import APIRouter, HTTPException, Body, Request, status
from typing import Dict, Any, List, Set, Optional, Union
import re
import logging
import json
import os
from pathlib import Path

from utils.ai_client import ai_client
from routers.cv_analyzer import cv_storage
from utils.file_parser import FileParser, load_skills_database, load_special_cases
from utils.translations import translator

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Job Scanner"])

# Initialize FileParser instance
file_parser = FileParser()

# Load the skills database at startup
SKILL_DATABASE = load_skills_database()
SPECIAL_CASES = load_special_cases()

async def extract_skills_from_text(job_info: Union[Dict[str, Any], str], use_ai: bool = True) -> Dict[str, List[str]]:
    """
    Extract skills from the job info using AI with fallback to FileParser's skill extraction.
    
    Args:
        job_info: Dictionary containing job information with 'raw_text' key or raw text string
        use_ai: Whether to use AI for skill extraction (falls back to FileParser if False or on failure)
        
    Returns:
        Dictionary with categorized skills (skills, technologies, soft_skills)
    """
    # Extract text from job_info
    text = ""
    if isinstance(job_info, dict):
        text = job_info.get('raw_text', '')
        if not text and 'job_description' in job_info and isinstance(job_info['job_description'], str):
            text = job_info['job_description']
        elif not text and 'description' in job_info and isinstance(job_info['description'], str):
            text = job_info['description']
    elif isinstance(job_info, str):
        text = job_info
    
    if not text:
        logger.warning("No text provided for skill extraction")
        return {"skills": [], "technologies": [], "soft_skills": []}
    
    # Try AI extraction first if enabled
    if use_ai:
        try:
            logger.info("Attempting AI skill extraction")
            ai_skills = await ai_client.extract_skills(text)
            if any(ai_skills.values()):  # If we got any skills from AI
                logger.info(f"AI extracted skills: {ai_skills}")
                return ai_skills
        except Exception as e:
            logger.warning(f"AI skill extraction failed, falling back to FileParser: {str(e)}")
    
    # Fall back to FileParser if AI extraction fails or is disabled
    try:
        logger.info("Falling back to FileParser skill extraction")
        all_skills = file_parser.extract_skills_from_text(text)
        
        if not all_skills:
            logger.info("No skills extracted from text")
            return {"skills": [], "technologies": [], "soft_skills": []}
            
        # Normalize skills: lowercase, strip, and filter out empty strings
        normalized_skills = list({
            skill.lower().strip()
            for skill in all_skills 
            if skill and isinstance(skill, str) and skill.strip()
        })
        
        logger.info(f"Extracted {len(normalized_skills)} skills using FileParser")
        
        # Return skills in appropriate categories (FileParser doesn't categorize)
        return {
            "skills": normalized_skills,
            "technologies": [],
            "soft_skills": []
        }
        
    except Exception as e:
        logger.error(f"Error in FileParser skill extraction: {str(e)}", exc_info=True)
        return {"skills": [], "technologies": [], "soft_skills": []}

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
    
    # Single pass normalization and matching
    total_required = 0
    total_matched = 0
    
    for category, required_skills in job_skills.items():
        if not required_skills or not isinstance(required_skills, list):
            continue
            
        # Normalize required skills for this category
        required_normalized = set(skill.strip().lower() for skill in required_skills if skill and isinstance(skill, str))
        if not required_normalized:
            continue
            
        # Get and normalize CV skills for this category
        cv_category_skills = cv_skills.get(category, [])
        cv_normalized = set()
        if cv_category_skills and isinstance(cv_category_skills, list):
            cv_normalized = set(skill.strip().lower() for skill in cv_category_skills 
                              if skill and isinstance(skill, str))
        
        # Calculate matches
        matched_skills = required_normalized.intersection(cv_normalized)
        matched_count = len(matched_skills)
        
        # Log detailed matching information
        if matched_count < len(required_normalized):
            missing_skills = required_normalized - matched_skills
            logger.info(f"Missing {len(missing_skills)}/{len(required_normalized)} "
                      f"skills in category '{category}': {', '.join(missing_skills)}")
        
        total_required += len(required_normalized)
        total_matched += matched_count
    
    # Avoid division by zero
    if total_required == 0:
        logger.warning("No required skills found in job description")
        return 0.0
        
    # Calculate and return percentage match
    match_percentage = (total_matched / total_required) * 100
    logger.info(f"Match calculation - Required: {total_required}, "
               f"Matched: {total_matched}, Percentage: {match_percentage:.2f}%")
    
    return round(match_percentage, 2)

async def generate_improvement_suggestions(
    job_skills: Dict[str, List[str]], 
    cv_skills: Dict[str, List[str]], 
    language: str,
    use_ai: bool = True
) -> List[Dict[str, Any]]:
    """
    Generate improvement suggestions based on job requirements and CV skills.
    
    Args:
        job_skills: Dictionary of skills from job description
        cv_skills: Dictionary of skills from CV
        language: Language code for the response
        use_ai: Whether to use AI for generating suggestions (falls back to basic if False or on failure)
        
    Returns:
        List of suggestion cards with priority and category information
    """
    # Try AI-powered suggestions first if enabled
    if use_ai:
        try:
            logger.info("Generating AI-powered suggestions")
            ai_suggestions = await ai_client.generate_suggestions(
                job_skills=job_skills,
                cv_skills=cv_skills,
                language=language
            )
            if ai_suggestions:
                logger.info(f"Generated {len(ai_suggestions)} AI suggestions")
                return ai_suggestions
        except Exception as e:
            logger.warning(f"AI suggestion generation failed, falling back to basic suggestions: {str(e)}")
    
    # Fall back to basic suggestions if AI is disabled or fails
    logger.info("Using basic suggestion generation")
    suggestions = []
    
    # Normalize all skills to lowercase and remove duplicates
    job_skills_normalized = {
        'skills': list({s.lower().strip() for s in job_skills.get('skills', []) if s and isinstance(s, str)}),
        'technologies': list({s.lower().strip() for s in job_skills.get('technologies', []) if s and isinstance(s, str)}),
        'soft_skills': list({s.lower().strip() for s in job_skills.get('soft_skills', []) if s and isinstance(s, str)})
    }
    
    cv_skills_normalized = {
        'skills': list({s.lower().strip() for s in cv_skills.get('skills', []) if s and isinstance(s, str)}),
        'technologies': list({s.lower().strip() for s in cv_skills.get('technologies', []) if s and isinstance(s, str)}),
        'soft_skills': list({s.lower().strip() for s in cv_skills.get('soft_skills', []) if s and isinstance(s, str)})
    }
    
    # 1. Missing skills (high priority)
    # Combine all job skills and CV skills for comparison
    all_job_skills = set(job_skills_normalized['skills'] + 
                         job_skills_normalized['technologies'] + 
                         job_skills_normalized['soft_skills'])
    
    all_cv_skills = set(cv_skills_normalized['skills'] + 
                       cv_skills_normalized['technologies'] + 
                       cv_skills_normalized['soft_skills'])
    
    # Find missing skills (in job but not in CV)
    missing_skills = list(all_job_skills - all_cv_skills)
    
    if missing_skills:
        # Sort missing skills for consistent ordering
        missing_skills_sorted = sorted(missing_skills)
        
        suggestions.append({
            "id": "missing_skills",
            "title": "Missing Key Skills",
            "description": "These skills are required for the job but not found in your CV",
            "priority": 1,  # high
            "category": "skills",
            "icon": "code",
            "items": [{"text": skill.title(), "action": "add"} for skill in missing_skills_sorted[:10]]  # Increased limit to 10
        })
    
    # 2. Skills to highlight (high priority)
    strong_skills = []
    for category in ["skills", "technologies"]:
        strong = list(set(cv_skills_normalized.get(category, [])) - set(job_skills_normalized.get(category, [])))
        strong_skills.extend(strong)
    
    if strong_skills:
        suggestions.append({
            "id": "skills_to_highlight",
            "title": "Skills to Highlight",
            "description": "These valuable skills in your CV aren't mentioned in the job description",
            "priority": 1,  # high
            "category": "highlight",
            "icon": "star",  # Using 'star' icon which maps to <Star> component
            "items": [{"text": skill, "action": "highlight"} for skill in strong_skills[:5]]
        })
    
    # 3. Matched skills (medium priority)
    matched_skills = []
    for category in ["skills", "technologies", "soft_skills"]:
        matched = list(set(job_skills_normalized.get(category, [])) & set(cv_skills_normalized.get(category, [])))
        matched_skills.extend(matched)
    
    if matched_skills:
        suggestions.append({
            "id": "matching_skills",
            "title": "Matching Skills",
            "description": "These skills from the job description match your CV",
            "priority": 2,  # medium
            "category": "matching",
            "icon": "group",  # Using 'group' icon which maps to <Users> component
            "items": [{"text": skill, "action": "highlight"} for skill in matched_skills[:5]]
        })
    
    # 4. Skills to learn (medium priority)
    related_skills = []
    if missing_skills:
        # Take a couple of missing skills and suggest learning resources
        related_skills = missing_skills[:2]
    
    if related_skills:
        suggestions.append({
            "id": "skills_to_learn",
            "title": "Skills to Learn",
            "description": "Consider developing these skills to better match job requirements",
            "priority": 2,  # medium
            "category": "learning",
            "icon": "format_align_left",  # Using 'format_align_left' icon which maps to <AlignLeft> component
            "items": [{"text": f"Learn {skill}", "action": "suggest"} for skill in related_skills]
        })
    
    # 5. Profile enhancement (low priority)
    suggestions.append({
        "id": "profile_enhancement",
        "title": "Enhance Your Profile",
        "description": "Consider these suggestions to improve your profile's impact",
        "priority": 3,  # low
        "category": "suggestion",
        "icon": "star",  # Using 'star' icon which maps to <Star> component
        "items": [
            {"text": "Add project examples", "action": "suggest"},
            {"text": "Include specific achievements", "action": "suggest"},
            {"text": "Highlight relevant experience", "action": "suggest"},
            {"text": "Add metrics to quantify impact", "action": "suggest"},
            {"text": "Include relevant certifications", "action": "suggest"}
        ]
    })
    
    # Sort suggestions by priority (ascending - lower numbers are higher priority)
    suggestions.sort(key=lambda x: x["priority"])
    
    # Ensure we don't exceed 5 suggestions
    return suggestions[:5]

def get_score_interpretation(match_score: float, language: str) -> str:
    """
    Get score interpretation based on match score and language.
    
    Args:
        match_score: Match score as a float between 0 and 100
        language: Language code for the response
        
    Returns:
        Score interpretation as a string
    """
    # Default interpretations in case translations are missing
    default_interpretations = {
        "low": "There is significant room for improvement in matching the job requirements.",
        "medium": "You have some matching skills, but could improve your match.",
        "high": "Great match! Your skills align well with the job requirements."
    }
    
    # Get the appropriate translation or fall back to default
    if match_score < 50:
        trans = translator.get("score_interpretation.low", language)
        return trans if trans != "score_interpretation.low" else default_interpretations["low"]
    elif match_score < 80:
        trans = translator.get("score_interpretation.medium", language)
        return trans if trans != "score_interpretation.medium" else default_interpretations["medium"]
    else:
        trans = translator.get("score_interpretation.high", language)
        return trans if trans != "score_interpretation.high" else default_interpretations["high"]

@router.post("/match")
async def job_match(
    request: Request,
    cv_id: str = Body(..., embed=True, description="ID of the uploaded CV"),
    job_description: Any = Body(..., embed=True, description="Job description text or structured data to analyze"),
    language: Optional[str] = Body(None, embed=True, description="Language code for the response (e.g., 'en', 'bg')"),
    use_ai: bool = Body(True, embed=True, description="Whether to use AI for skill extraction and suggestions")
):
    """
    Extract keywords from job description, compare to CV, and return match analysis.
    
    Args:
        request: FastAPI request object
        cv_id: ID of the uploaded CV to compare against
        job_description: Job description text or structured data to analyze
        language: Language code for the response (e.g., 'en', 'bg')
        use_ai: Whether to use AI for skill extraction and suggestions
        
    Returns:
        Dictionary containing job match analysis
    """
    language = language or 'en'  # Default to English if not specified
    logger.info(f"Starting job match for CV ID: {cv_id} (AI: {use_ai})")
    
    try:
        # Get CV data from storage
        if cv_id not in cv_storage:
            logger.error(f"CV not found for ID: {cv_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=translator.translate("cv_not_found", language)
            )
            
        cv_data = cv_storage[cv_id]
        
        # Get raw text from CV data
        cv_raw_text = ""
        if 'parsed_data' in cv_data and 'raw_text' in cv_data['parsed_data']:
            cv_raw_text = cv_data['parsed_data']['raw_text']
        elif 'raw_text' in cv_data:
            cv_raw_text = cv_data['raw_text']
            
        if not cv_raw_text:
            logger.error(f"No text content found in CV {cv_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=translator.translate("cv_no_text_content", language)
            )
            
        # Extract skills from CV using AI with fallback to FileParser
        cv_skills = await extract_skills_from_text(cv_raw_text, use_ai=use_ai)
        logger.info(f"Extracted {sum(len(v) for v in cv_skills.values())} skills from CV")
        
        # Get job description text
        job_text = job_description
        if isinstance(job_description, dict) and 'raw_text' in job_description:
            job_text = job_description['raw_text']
            
        # Extract skills from job description using AI with fallback to FileParser
        job_skills = await extract_skills_from_text(job_text, use_ai=use_ai)
        logger.info(f"Extracted {sum(len(v) for v in job_skills.values())} skills from job description")
        
        # Calculate match score
        match_score = calculate_match_score(job_skills, cv_skills)
        
        # Generate improvement suggestions (AI-powered with fallback to basic)
        suggestions = await generate_improvement_suggestions(
            job_skills=job_skills,
            cv_skills=cv_skills,
            language=language,
            use_ai=use_ai
        )
        
        # Get extracted skills from CV data if available
        extracted_skills = []
        if 'extracted_skills' in cv_data:
            extracted_skills = cv_data['extracted_skills']
        elif 'parsed_data' in cv_data and 'extracted_skills' in cv_data['parsed_data']:
            extracted_skills = cv_data['parsed_data']['extracted_skills']
            
        logger.info(f"Found {len(extracted_skills)} extracted skills in CV data")
        
        # Process skills from parsed_data if available
        if "parsed_data" in cv_data and isinstance(cv_data["parsed_data"], dict):
            parsed_data = cv_data["parsed_data"]
            
            # Ensure cv_skills["skills"] is a set for aggregation
            if not isinstance(cv_skills.get("skills"), set):
                cv_skills["skills"] = set(cv_skills.get("skills", []))
            
            # Add skills from skills section
            if "skills" in parsed_data and isinstance(parsed_data["skills"], list):
                cv_skills["skills"].update(
                    str(skill).lower().strip() 
                    for skill in parsed_data["skills"] 
                    if skill and str(skill).strip()
                )
            
            # Extract skills from raw text using FileParser if available
            if "raw_text" in parsed_data and isinstance(parsed_data["raw_text"], str):
                extracted = file_parser.extract_skills_from_text(parsed_data["raw_text"])
                cv_skills["skills"].update(
                    str(skill).lower().strip() 
                    for skill in extracted 
                    if skill and str(skill).strip()
                )
            
            logger.info(f"Processed skills from parsed_data")
        
        # Convert all sets to lists for the response
        cv_skills = {k: list(v) if isinstance(v, (set, list)) else v for k, v in cv_skills.items()}
        logger.info(f"Final skill counts - Skills: {len(cv_skills['skills'])}, "
                  f"Technologies: {len(cv_skills['technologies'])}, "
                  f"Soft Skills: {len(cv_skills['soft_skills'])}")
        
        # Log extracted skills for debugging
        logger.info(f"Extracted job skills: {json.dumps(job_skills, indent=2)}")
        logger.info(f"CV skills structure: {json.dumps(cv_skills, indent=2)}")
        
        if not any(cv_skills.values()):
            logger.warning("No skills could be extracted from the CV")
        
        try:
            # Calculate match score with case-insensitive comparison
            match_score = calculate_match_score(job_skills, cv_skills)
        except Exception as e:
            logger.error(f"Error calculating match score: {str(e)}", exc_info=True)
            # Fallback to 0 if there's an error in calculation
            match_score = 0.0
        
        # Generate improvement suggestions
        suggestions = await generate_improvement_suggestions(job_skills, cv_skills, language, use_ai)
        
        # Log the match results for debugging
        logger.info(f"Match score: {match_score}")
        logger.info(f"Generated suggestions: {suggestions[:2]}..." if suggestions else 'No suggestions')
        
        # Get all translated strings first
        translated_message = translator.get("success.job_match_completed", language)
        score_interpretation = get_score_interpretation(match_score, language)
        
        # Calculate missing and matched skills
        missing_skills = {}
        matched_skills = {}
        
        # Process each skill category
        for category in ['skills', 'technologies', 'soft_skills']:
            job_skills_list = job_skills.get(category, [])
            cv_skills_list = cv_skills.get(category, [])
            
            # Convert to sets for easier comparison
            job_skills_set = {skill.lower() for skill in job_skills_list}
            cv_skills_set = {skill.lower() for skill in cv_skills_list}
            
            # Find matched and missing skills
            matched = job_skills_set.intersection(cv_skills_set)
            missing = job_skills_set - cv_skills_set
            
            # Store with original casing
            matched_skills[category] = [
                skill for skill in job_skills_list 
                if skill.lower() in matched
            ]
            missing_skills[category] = [
                skill for skill in job_skills_list 
                if skill.lower() in missing
            ]
        
        # Prepare response with all the data needed by the frontend
        response = {
            "success": True,
            "message": translated_message if translated_message != "success.job_match_completed" else "Job match completed successfully",
            "match_score": round(match_score, 1),
            "score_interpretation": score_interpretation if not score_interpretation.startswith("score_interpretation.") 
                                 else "Match score: {}".format(round(match_score, 1)),
            "job_skills": job_skills,
            "cv_skills": cv_skills,
            "suggestions": suggestions,  # This is now a list of suggestion cards
            # For backward compatibility
            "missing_skills": missing_skills.get('skills', []),
            "matched_skills": matched_skills.get('skills', []),
            # New structured response
            "missing_skills_by_category": missing_skills,
            "matched_skills_by_category": matched_skills
        }
        
        # Extract missing and matched skills from suggestions
        for suggestion in suggestions:
            if suggestion.get("id") == "missing_skills":
                # Get missing skills directly from the missing_skills suggestion
                response["missing_skills"] = [item["text"] for item in suggestion.get("items", []) 
                                            if item.get("action") == "add"]
            elif suggestion.get("id") == "matching_skills":
                # Get matched skills directly from the matching_skills suggestion
                response["matched_skills"] = [item["text"] for item in suggestion.get("items", []) 
                                            if item.get("action") == "highlight"]
        
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