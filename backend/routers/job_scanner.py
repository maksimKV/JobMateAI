from fastapi import APIRouter, HTTPException, Body, Request, status
from typing import Dict, Any, List, Set, Optional
import re
import logging
import json
import os
from pathlib import Path

from utils.ai_client import ai_client
from routers.cv_analyzer import cv_storage
from utils.file_parser import FileParser
from utils.translations import translator

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Job Scanner"])

# Load skills database from JSON file
def load_skills_database() -> Dict[str, List[str]]:
    """Load the skills database from the JSON file."""
    try:
        # Get the absolute path to the skills database file
        base_dir = Path(__file__).parent.parent
        skills_file = base_dir / "data" / "skills_database.json"
        
        with open(skills_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load skills database: {str(e)}")
        # Return a minimal skills database if the file can't be loaded
        return {
            "programming_languages": ["python", "javascript", "java"],
            "frameworks": ["react", "django", "flask"],
            "databases": ["mysql", "mongodb", "postgresql"],
            "cloud_platforms": ["aws", "azure", "google cloud"],
            "devops_tools": ["docker", "kubernetes", "terraform"],
            "ai_ml": ["tensorflow", "pytorch", "scikit-learn"]
        }

# Load the skills database at startup
SKILL_DATABASE = load_skills_database()

def extract_skills_using_regex(text: str) -> Dict[str, set]:
    """Extract skills using regex patterns from the given text."""
    tech_skills = set()
    soft_skills = set()
    
    # Common patterns for technical skills
    tech_patterns = [
        r'\b(?:html|css|js|javascript|typescript|ts|jsx|tsx)\b',
        r'\b(?:python|py|java|c#|c\+\+|cpp|go|rust|kotlin|swift|php|ruby|scala|r|dart|elixir|clojure|haskell|perl)\b',
        r'\b(?:react|angular|vue|svelte|next\.?js|nuxt\.?js|sveltekit|express|django|flask|fastapi|spring(?:\s+boot)?|laravel|rails|ruby\s+on\s+rails|asp\.net|\.net\s+core|blazor|xamarin|flutter|react\s+native|ionic|electron)\b',
        r'\b(?:mysql|postgres(?:ql)?|mongodb|redis|elasticsearch|dynamodb|cassandra|couchbase|oracle|sql\s+server|sqlite|firestore|bigtable|cosmosdb|neo4j|arangodb)\b',
        r'\b(?:aws|amazon\s+web\s+services|azure|google\s+cloud|gcp|ibm\s+cloud|oracle\s+cloud|alibaba\s+cloud|digitalocean|heroku|vercel|netlify|firebase)\b',
        r'\b(?:docker|kubernetes|k8s|terraform|ansible|puppet|chef|jenkins|github\s+actions|gitlab\s+ci|circleci|travis\s+ci|argo\s+cd|flux|helm|istio|linkerd)\b',
        r'\b(?:tensorflow|pytorch|keras|scikit-learn|opencv|nltk|spacy|huggingface|langchain|llama|gpt|bert|transformers|stable\s+diffusion|dall-e|midjourney)\b'
    ]
    
    # Common patterns for soft skills
    soft_patterns = [
        r'\b(?:communication|teamwork|leadership|problem-?solving|critical\s+thinking|adaptability|time\s+management|creativity|emotional\s+intelligence|conflict\s+resolution|collaboration|active\s+listening|empathy|patience|flexibility|work\s+ethic|responsibility|dependability|self-?motivation|professionalism|initiative|decision\s+making|stress\s+management|organization|attention\s+to\s+detail|multitasking|networking|negotiation|presentation|public\s+speaking|writing|research|analysis|planning|delegation|mentoring|coaching|training|supervision|project\s+management|strategic\s+thinking|innovation|resourcefulness|persuasion|influence|diplomacy|tact|cultural\s+awareness|customer\s+service|sales|marketing|business\s+development|financial\s+management|risk\s+management|quality\s+assurance|compliance|regulatory|legal|ethics|diversity|inclusion|equity|belonging|accessibility|sustainability|corporate\s+social\s+responsibility)\b'
    ]
    
    # Search for technical skills
    for pattern in tech_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        tech_skills.update(match.lower() for match in matches)
    
    # Search for soft skills
    for pattern in soft_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        soft_skills.update(match.lower() for match in matches)
    
    return {"tech_skills": tech_skills, "soft_skills": soft_skills}

def extract_skills_from_structured(data: Dict[str, Any]) -> Dict[str, set]:
    """Extract skills from structured data like job descriptions or CVs."""
    tech_skills = set()
    soft_skills = set()
    
    # Common fields that might contain skills
    skill_fields = [
        'skills', 'technologies', 'technical_skills', 'programming_languages',
        'languages', 'frameworks', 'tools', 'certifications', 'expertise'
    ]
    
    # Check each field for skills
    for field in skill_fields:
        if field in data and isinstance(data[field], (list, set)):
            for item in data[field]:
                if isinstance(item, str):
                    # Check if it's a technical skill or soft skill
                    item_lower = item.lower()
                    if any(skill in item_lower for category in SKILL_DATABASE.values() for skill in category):
                        tech_skills.add(item.strip())
                    else:
                        soft_skills.add(item.strip())
    
    return {"tech_skills": tech_skills, "soft_skills": soft_skills}

def extract_skills_from_text(job_info: Dict[str, Any]) -> Dict[str, List[str]]:
    """
    Extract skills from the job info using a hybrid approach:
    1. Try structured extraction first
    2. Fall back to regex pattern matching
    3. Finally, use keyword matching as a last resort
    
    Args:
        job_info: Dictionary containing job information with 'raw_text' key
        
    Returns:
        Dictionary with categorized skills (skills, technologies, soft_skills)
    """
    logger.info("Extracting skills using hybrid approach")
    
    # Initialize sets to store skills
    tech_skills = set()
    soft_skills = set()
    
    # Get raw text from job info
    text = ""
    if isinstance(job_info, dict):
        text = job_info.get('raw_text', '')
        if not text and 'job_description' in job_info and isinstance(job_info['job_description'], str):
            text = job_info['job_description']
        elif not text and 'description' in job_info and isinstance(job_info['description'], str):
            text = job_info['description']
    elif isinstance(job_info, str):
        text = job_info
    
    # Convert to lowercase for case-insensitive matching
    text_lower = text.lower()
    
    # 1. Try structured extraction first if possible
    if isinstance(job_info, dict):
        structured_result = extract_skills_from_structured(job_info)
        tech_skills.update(structured_result["tech_skills"])
        soft_skills.update(structured_result["soft_skills"])
    
    # 2. If no skills found, try regex extraction
    if not tech_skills and not soft_skills:
        regex_result = extract_skills_using_regex(text_lower)
        tech_skills.update(regex_result["tech_skills"])
        soft_skills.update(regex_result["soft_skills"])
    
    # 3. If still no skills, try keyword matching from the database
    if not tech_skills:
        for category, skills in SKILL_DATABASE.items():
            for skill in skills:
                if skill in text_lower:
                    tech_skills.add(skill)
    
    # 4. Additional processing for common variations
    processed_tech_skills = set()
    for skill in tech_skills:
        # Handle common variations (e.g., "node.js" -> "nodejs")
        normalized = skill.replace('.', '').replace(' ', '').lower()
        processed_tech_skills.add(normalized)
    
    # Convert to title case for better display
    tech_skills_display = {s.title() for s in processed_tech_skills}
    soft_skills_display = {s.title() for s in soft_skills}
    
    # Log the extracted skills for debugging
    logger.info(f"Extracted technical skills: {tech_skills_display}")
    logger.info(f"Extracted soft skills: {soft_skills_display}")
    
    # Return the results
    return {
        "skills": list(tech_skills_display),
        "technologies": list(tech_skills_display),
        "soft_skills": list(soft_skills_display)
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

def generate_improvement_suggestions(job_skills: Dict[str, List[str]], cv_skills: Dict[str, List[str]], language: str) -> List[Dict[str, Any]]:
    """
    Generate improvement suggestions based on job requirements and CV skills.
    
    Args:
        job_skills: Dictionary of skills from job description
        cv_skills: Dictionary of skills from CV
        language: Language code for the response
        
    Returns:
        List of suggestion cards with priority and category information
    """
    suggestions = []
    
    # Get all skills in lowercase for case-insensitive comparison
    job_skills_lower = {k: [s.lower() for s in v] for k, v in job_skills.items()}
    cv_skills_lower = {k: [s.lower() for s in v] for k, v in cv_skills.items()}
    
    # 1. Missing skills (high priority)
    missing_skills = []
    for category in ["skills", "technologies", "soft_skills"]:
        missing = list(set(job_skills_lower.get(category, [])) - set(cv_skills_lower.get(category, [])))
        missing_skills.extend(missing)
    
    if missing_skills:
        suggestions.append({
            "id": "missing_skills",
            "title": "Missing Key Skills",
            "description": "These skills are required for the job but not found in your CV",
            "priority": 1,  # high
            "category": "skills",
            "icon": "code",  # Using 'code' icon which maps to <Code> component
            "items": [{"text": skill, "action": "add"} for skill in missing_skills[:5]]
        })
    
    # 2. Skills to highlight (high priority)
    strong_skills = []
    for category in ["skills", "technologies"]:
        strong = list(set(cv_skills_lower.get(category, [])) - set(job_skills_lower.get(category, [])))
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
        matched = list(set(job_skills_lower.get(category, [])) & set(cv_skills_lower.get(category, [])))
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
        
        # Get CV data and extract skills with proper transformation
        cv_data = cv_storage.get(cv_id, {})
        
        # Extract skills from CV with multiple fallback strategies
        cv_skills = {"skills": [], "technologies": [], "soft_skills": []}
        
        # Strategy 1: Check for extracted_skills in CV data (direct list)
        if "extracted_skills" in cv_data and isinstance(cv_data["extracted_skills"], list):
            cv_skills["skills"] = list(set(skill.lower() for skill in cv_data["extracted_skills"] if skill and isinstance(skill, str)))
            cv_skills["technologies"] = cv_skills["skills"].copy()
            logger.info(f"Found {len(cv_skills['skills'])} skills in extracted_skills")
        
        # Strategy 2: Check for skills in parsed_data
        if not cv_skills["skills"] and "parsed_data" in cv_data and isinstance(cv_data["parsed_data"], dict):
            parsed_data = cv_data["parsed_data"]
            
            # Extract from skills section if available
            if "skills" in parsed_data and isinstance(parsed_data["skills"], list):
                cv_skills["skills"].extend(skill.lower() for skill in parsed_data["skills"] if skill and isinstance(skill, str))
            
            # Extract from raw text if available
            if "raw_text" in parsed_data and isinstance(parsed_data["raw_text"], str):
                extracted = extract_skills_using_regex(parsed_data["raw_text"])
                cv_skills["skills"].extend(skill.lower() for skill in extracted["tech_skills"])
                cv_skills["soft_skills"].extend(skill.lower() for skill in extracted["soft_skills"])
            
            # Remove duplicates
            cv_skills["skills"] = list(set(cv_skills["skills"]))
            cv_skills["technologies"] = cv_skills["skills"].copy()
            logger.info(f"Extracted {len(cv_skills['skills'])} skills from parsed_data")
        
        # Ensure all skills are strings and not empty
        for key in ["skills", "technologies", "soft_skills"]:
            cv_skills[key] = [str(skill).strip() for skill in cv_skills[key] if skill and str(skill).strip()]
        
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
        suggestions = generate_improvement_suggestions(job_skills, cv_skills, language)
        
        # Log the match results for debugging
        logger.info(f"Match score: {match_score}")
        logger.info(f"Generated suggestions: {json.dumps(suggestions, indent=2) if suggestions else 'No suggestions'}")
        
        # Get all translated strings first
        translated_message = translator.get("success.job_match_completed", language)
        score_interpretation = get_score_interpretation(match_score, language)
        
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
            "missing_skills": [item["text"] for suggestion in suggestions 
                             for item in suggestion.get("items", []) 
                             if item.get("action") == "add"],
            "matched_skills": [item["text"] for suggestion in suggestions 
                             for item in suggestion.get("items", []) 
                             if item.get("action") == "highlight"]
        }
        
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