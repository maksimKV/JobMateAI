from fastapi import APIRouter, HTTPException, Body, Request, status
from typing import Dict, Any, Optional
import logging

from utils.ai_client import ai_client
from utils.translations import translator
from routers.cv_analyzer import cv_storage

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cover-letter", tags=["Cover Letter"])

@router.post("/generate")
async def generate_cover_letter(
    request: Request,
    cv_id: str = Body(..., embed=True, description="ID of the uploaded CV"),
    job_description: str = Body(..., embed=True, description="Job description to tailor the cover letter"),
    language: Optional[str] = Body(None, embed=True, description="Language for the cover letter")
) -> Dict[str, Any]:
    """
    Generate a personalized cover letter based on uploaded CV and job description.
    The cover letter will be generated with a professional tone.
    
    Args:
        cv_id: ID of the previously uploaded CV
        job_description: The job description to tailor the cover letter to
        language: Language code (e.g., 'en', 'bg'). If not provided, uses request language.
    """
    # Get language from request if not provided
    req_language = getattr(request.state, 'language', 'en')
    language = language or req_language
    
    logger.info(f"Generating cover letter for CV {cv_id} in {language} with {tone} tone")
    
    # Validate CV exists
    if cv_id not in cv_storage:
        error_msg = translator.get("errors.cv_not_found", language, cv_id=cv_id)
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_msg
        )
    
    try:
        cv_data = cv_storage[cv_id]
        cv_content = cv_data["parsed_data"].get("raw_text", "")
        
        if not cv_content:
            error_msg = translator.get("errors.invalid_cv_content", language)
            logger.error(error_msg)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Generate cover letter using AI with professional tone
        result = await ai_client.generate_cover_letter(
            cv_content=cv_content,
            job_description=job_description,
            language=language
        )
        
        # Log success
        logger.info(f"Successfully generated cover letter for CV {cv_id}")
        
        return {
            "success": True,
            "message": translator.get("success.cover_letter_generated", language),
            "cover_letter": result.get("content", ""),
            "company_name": result.get("company_name", "Company"),
            "language": language,
            "tone": tone
        }
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Error generating cover letter: {str(e)}", exc_info=True)
        error_msg = translator.get(
            "errors.cover_letter_generation_failed", 
            language, 
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )