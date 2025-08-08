from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Request, Depends, status
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional, Set
import os
import logging
import uuid
from pathlib import Path
from datetime import datetime
import re

# Import translation and AI services
from utils.translations import translator
from utils.ai_client import ai_client
from utils.file_parser import FileParser

# Import language helper
from middleware.language import get_request_language

# Set up logging
logger = logging.getLogger(__name__)
logger.info("Initializing CV Analyzer router...")

router = APIRouter(prefix="", tags=["CV Analysis"])
logger.info("CV Analyzer router created")

# In-memory storage for parsed CVs (in production, use a database)
cv_storage = {}

# File upload configuration
UPLOAD_DIR = Path("uploads/cv")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTENSIONS = {"pdf", "docx", "doc"}  # Removed txt as it's not properly handled
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
}

def get_file_extension(filename: str) -> str:
    """Get the file extension in lowercase"""
    return Path(filename).suffix.lower()[1:] if '.' in filename else ""

def is_allowed_file(filename: str) -> bool:
    """
    Check if the file has an allowed extension and MIME type.
    
    Args:
        filename: Name of the file to check
        
    Returns:
        bool: True if file extension is allowed, False otherwise
    """
    return (
        '.' in filename and
        get_file_extension(filename) in ALLOWED_EXTENSIONS
    )

def validate_file_size(file_content: bytes) -> bool:
    """
    Validate that the file size is within allowed limits.
    
    Args:
        file_content: The file content as bytes
        
    Returns:
        bool: True if file size is valid, False otherwise
    """
    return len(file_content) <= MAX_FILE_SIZE

def validate_mime_type(file_content: bytes, filename: str) -> bool:
    """
    Validate that the file's MIME type matches its extension.
    
    Args:
        file_content: The file content as bytes
        filename: Name of the file
        
    Returns:
        bool: True if MIME type is valid, False otherwise
    """
    import magic
    mime = magic.Magic(mime=True)
    mime_type = mime.from_buffer(file_content)
    
    # Check if MIME type is allowed
    if mime_type not in ALLOWED_MIME_TYPES:
        return False
        
    # Check if extension matches MIME type
    file_ext = get_file_extension(filename)
    return ALLOWED_MIME_TYPES[mime_type] == file_ext

@router.get("/")
async def cv_root(request: Request):
    """Root endpoint for CV Analyzer API"""
    language = get_request_language(request)
    return {
        "message": translator.get("cv_analyzer.welcome", language),
        "status": "operational",
        "version": "1.0.0"
    }

@router.get("/list")
async def list_cvs(request: Request) -> Dict[str, Any]:
    """
    List all uploaded CVs.
    
    Returns:
        Dict containing the list of CVs and total count
    """
    language = get_request_language(request)
    logger.info(f"List CVs endpoint called (language: {language})")
    
    try:
        if not cv_storage:  # Return early if storage is empty
            return {
                "success": True,
                "message": translator.get("success.no_cvs_found", language),
                "total_cvs": 0,
                "cvs": []
            }
            
        cv_list = []
        for cv_id, cv_data in cv_storage.items():
            # Safely access dictionary values with defaults
            parsed_data = cv_data.get("parsed_data", {})
            extracted_skills = cv_data.get("extracted_skills", [])
            
            cv_list.append({
                "id": cv_id,
                "filename": cv_data.get("filename", translator.get("cv_analyzer.unknown_filename", language)),
                "upload_timestamp": cv_data.get("upload_timestamp"),
                "parsed_data": parsed_data,
                "extracted_skills": extracted_skills,
                "analysis": cv_data.get("analysis", {})
            })
        
        return {
            "success": True,
            "message": translator.get("success.cvs_retrieved", language, count=len(cv_list)),
            "total_cvs": len(cv_list),
            "cvs": cv_list
        }
    except Exception as e:
        logger.error(f"Error listing CVs: {str(e)}")
        error_msg = translator.get("errors.failed_to_list_cvs", language, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )

@router.post("/upload")
async def upload_cv(
    request: Request,
    file: UploadFile = File(..., description="The CV/resume file to upload")
):
    """
    Upload and parse a CV/resume file.
    
    Args:
        file: The CV file to upload (PDF, DOCX, or DOC)
        
    Returns:
        Information about the uploaded CV including its ID and parsed data
    """
    language = get_request_language(request)
    logger.info(f"Upload CV endpoint called with file: {file.filename} (language: {language})")
    
    try:
        # Read file content once
        file_content = await file.read()
        
        # Validate file type by extension
        if not is_allowed_file(file.filename):
            error_msg = translator.get(
                "errors.invalid_file_type", 
                language,
                allowed_types=", ".join(sorted(ALLOWED_EXTENSIONS))
            )
            logger.error(f"Invalid file type: {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=error_msg
            )
            
        # Validate file size
        if not validate_file_size(file_content):
            error_msg = translator.get(
                "errors.file_too_large",
                language,
                max_size=f"{MAX_FILE_SIZE // (1024 * 1024)}MB"
            )
            logger.error(f"File too large: {file.filename} ({len(file_content)} bytes)")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
            
        # Validate MIME type
        if not validate_mime_type(file_content, file.filename):
            error_msg = translator.get(
                "errors.invalid_file_type",
                language,
                allowed_types=", ".join(sorted(ALLOWED_EXTENSIONS))
            )
            logger.error(f"MIME type validation failed for: {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Generate a unique ID for this CV
        cv_id = str(uuid.uuid4())
        
        # Save the file using the async method
        file_extension = get_file_extension(file.filename)
        file_path = await FileParser.save_uploaded_file(
            file_content,
            f"{cv_id}.{file_extension}"
        )
        
        # Parse the CV file
        try:
            parsed_data = FileParser.parse_resume(file_path)
        except Exception as e:
            logger.error(f"Error parsing CV: {str(e)}")
            # Clean up the file if parsing fails
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as cleanup_error:
                logger.warning(f"Failed to clean up file {file_path}: {cleanup_error}")
            
            error_msg = translator.get(
                "errors.cv_parsing_failed",
                language,
                error=str(e)
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Extract skills from the parsed text
        extracted_skills = FileParser.extract_skills_from_text(
            parsed_data.get("raw_text", ""),
            language=language
        )
        
        # Store the parsed data
        cv_data = {
            "id": cv_id,
            "filename": file.filename,
            "file_path": file_path,
            "upload_timestamp": datetime.utcnow().isoformat(),
            "parsed_data": parsed_data,
            "extracted_skills": extracted_skills,
            "analysis": {}
        }
        
        # Store in memory (in production, save to database)
        cv_storage[cv_id] = cv_data
        
        # Generate AI analysis (async)
        try:
            # Get raw text from parsed data
            raw_text = parsed_data.get("raw_text", "")
            logger.info(f"Sending text to AI for analysis (length: {len(raw_text)} chars)")
            
            # Get AI analysis
            analysis = await ai_client.analyze_text(
                text=raw_text,
                analysis_type="cv_analysis"
            )
            
            # Store the raw analysis for debugging
            cv_data["analysis"] = analysis
            logger.debug(f"Raw AI analysis: {analysis}")
            
            # Extract skills from AI response with multiple fallback strategies
            ai_skills = []
            
            # Strategy 1: Check for direct 'skills' key
            if isinstance(analysis.get("skills"), list):
                ai_skills.extend([s for s in analysis["skills"] if isinstance(s, str)])
            
            # Strategy 2: Check for skills in nested sections
            for section in ["technical_skills", "skills_section", "competencies"]:
                if section in analysis and isinstance(analysis[section], list):
                    ai_skills.extend([s for s in analysis[section] if isinstance(s, str)])
            
            # Strategy 3: Look for skills in a string with delimiters
            skills_text = analysis.get("skills_text", "")
            if skills_text and isinstance(skills_text, str):
                # Split by common delimiters and clean up
                for item in re.split(r'[,\n\-•*]', skills_text):
                    skill = item.strip().lower()
                    if 2 <= len(skill) <= 50 and skill not in ai_skills:
                        ai_skills.append(skill)
            
            # Deduplicate and clean up skills
            if ai_skills:
                # Convert to lowercase and remove duplicates
                ai_skills = list({s.lower().strip() for s in ai_skills if s and isinstance(s, str)})
                
                # Add skills that aren't already in extracted_skills
                existing_skills = {s.lower() for s in cv_data["extracted_skills"]}
                new_skills = [s for s in ai_skills if s.lower() not in existing_skills]
                
                if new_skills:
                    logger.info(f"Adding {len(new_skills)} new skills from AI analysis")
                    cv_data["extracted_skills"].extend(new_skills)
                
                # Update the analysis with the processed skills
                if "skills" not in cv_data["analysis"]:
                    cv_data["analysis"]["skills"] = ai_skills
            
            logger.info(f"Total skills after AI analysis: {len(cv_data['extracted_skills'])}")
                
        except Exception as e:
            error_msg = f"Error generating AI analysis: {str(e)}"
            logger.error(error_msg, exc_info=True)
            cv_data["analysis"] = {
                "error": translator.get("errors.ai_analysis_failed", language, error=str(e)),
                "raw_error": str(e)
            }
        
        return {
            "success": True,
            "message": translator.get("success.file_uploaded", language),
            "cv_id": cv_id,
            "filename": file.filename,
            "file_size": len(file_content),
            "parsed_data": parsed_data,
            "extracted_skills": cv_data["extracted_skills"],
            "analysis": cv_data["analysis"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}", exc_info=True)
        error_msg = translator.get("errors.file_processing_error", language, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=error_msg
        )

@router.get("/{cv_id}")
async def get_cv_analysis(cv_id: str) -> Dict[str, Any]:
    """Get analysis for a specific CV.
    
    Returns:
        Dictionary containing CV analysis with guaranteed extracted_skills as a list.
    """
    if cv_id not in cv_storage:
        raise HTTPException(
            status_code=404,
            detail="CV not found"
        )
    
    cv_data = cv_storage[cv_id]
    
    # Ensure extracted_skills is always a list
    extracted_skills = cv_data.get("extracted_skills", [])
    if not isinstance(extracted_skills, list):
        extracted_skills = []
    
    # Safely get AI analysis with fallback
    ai_analysis = cv_data.get("analysis", {})
    
    # Ensure we have a valid structure object with default values
    structure = cv_data.get("parsed_data", {}).get("sections", {})
    if not isinstance(structure, dict):
        structure = {}
    
    # Set default structure values if they don't exist
    structure.setdefault("has_contact_info", False)
    structure.setdefault("has_education", False)
    structure.setdefault("has_experience", False)
    structure.setdefault("has_skills", False)
    structure.setdefault("has_projects", False)
    structure.setdefault("has_certifications", False)
    structure.setdefault("missing_sections", [])
    
    return {
        "cv_id": cv_id,
        "filename": cv_data.get("filename", ""),
        "analysis": {
            "structure": structure,
            "ai_feedback": ai_analysis.get("analysis", "No analysis available"),
            "extracted_skills": extracted_skills,
            "word_count": cv_data.get("parsed_data", {}).get("word_count", 0),
            "missing_sections": structure.get("missing_sections", [])
        }
    }

@router.get("/{cv_id}/skills")
async def get_cv_skills(cv_id: str) -> Dict[str, Any]:
    """Get extracted skills from a CV."""
    
    if cv_id not in cv_storage:
        raise HTTPException(
            status_code=404,
            detail="CV not found"
        )
    
    cv_data = cv_storage[cv_id]
    
    return {
        "cv_id": cv_id,
        "skills": cv_data["extracted_skills"],
        "total_skills": len(cv_data["extracted_skills"])
    }

@router.get("/{cv_id}/raw-text")
async def get_cv_raw_text(cv_id: str) -> Dict[str, Any]:
    """Get raw text content of a CV."""
    
    if cv_id not in cv_storage:
        raise HTTPException(
            status_code=404,
            detail="CV not found"
        )
    
    cv_data = cv_storage[cv_id]
    
    return {
        "cv_id": cv_id,
        "raw_text": cv_data["parsed_data"]["raw_text"],
        "word_count": cv_data["parsed_data"]["word_count"],
        "character_count": cv_data["parsed_data"]["character_count"]
    }

@router.delete("/{cv_id}")
async def delete_cv(cv_id: str) -> Dict[str, Any]:
    """Delete a CV from storage."""
    
    if cv_id not in cv_storage:
        raise HTTPException(
            status_code=404,
            detail="CV not found"
        )
    
    cv_data = cv_storage[cv_id]
    
    # Remove file from disk
    try:
        if os.path.exists(cv_data["file_path"]):
            os.remove(cv_data["file_path"])
    except Exception as e:
        print(f"Error deleting file: {e}")
    
    # Remove from storage
    del cv_storage[cv_id]
    
    return {
        "success": True,
        "message": f"CV {cv_id} deleted successfully"
    }