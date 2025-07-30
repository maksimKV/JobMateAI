from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from utils.ai_client import ai_client
from routers.cv_analyzer import cv_storage
from utils.file_parser import FileParser

router = APIRouter()

@router.post("/match")
async def job_match(
    cv_id: str = Body(..., embed=True),
    job_description: str = Body(..., embed=True)
) -> Dict[str, Any]:
    """Extract keywords from job description, compare to CV, and return match analysis."""
    if cv_id not in cv_storage:
        raise HTTPException(status_code=404, detail="CV not found. Please upload your CV first.")
    
    cv_data = cv_storage[cv_id]
    cv_skills = set(cv_data["extracted_skills"])
    
    # Use AI to extract job requirements/skills
    try:
        job_analysis = await ai_client.analyze_text(job_description, "job_analysis")
        # Try to parse out skills/technologies/soft skills from the AI response (expecting JSON or list)
        import json
        try:
            job_info = json.loads(job_analysis["analysis"])
        except Exception:
            # Fallback: try to extract lists from text
            job_info = {"skills": [], "technologies": [], "soft_skills": []}
        
        # Combine all extracted job requirements
        job_skills = set(job_info.get("skills", []) + job_info.get("technologies", []))
        job_soft_skills = set(job_info.get("soft_skills", []))
        
        # Match analysis
        matched_skills = list(cv_skills & job_skills)
        missing_skills = list(job_skills - cv_skills)
        match_percent = int(100 * len(matched_skills) / max(1, len(job_skills)))
        
        matched_soft_skills = list(cv_skills & job_soft_skills)
        missing_soft_skills = list(job_soft_skills - cv_skills)
        soft_skill_percent = int(100 * len(matched_soft_skills) / max(1, len(job_soft_skills)))
        
        return {
            "success": True,
            "match_percent": match_percent,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "soft_skill_percent": soft_skill_percent,
            "matched_soft_skills": matched_soft_skills,
            "missing_soft_skills": missing_soft_skills,
            "job_info": job_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing job description: {str(e)}")