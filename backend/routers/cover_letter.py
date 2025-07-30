from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from utils.ai_client import ai_client
from routers.cv_analyzer import cv_storage

router = APIRouter()

@router.post("/generate")
async def generate_cover_letter(
    cv_id: str = Body(..., embed=True),
    job_description: str = Body(..., embed=True),
    language: str = Body("English", embed=True)
) -> Dict[str, Any]:
    """Generate a personalized cover letter based on uploaded CV and job description."""
    if cv_id not in cv_storage:
        raise HTTPException(status_code=404, detail="CV not found. Please upload your CV first.")
    
    cv_data = cv_storage[cv_id]
    cv_content = cv_data["parsed_data"]["raw_text"]
    
    try:
        cover_letter = await ai_client.generate_cover_letter(cv_content, job_description, language)
        return {
            "success": True,
            "cover_letter": cover_letter,
            "language": language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating cover letter: {str(e)}")