from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from typing import Dict, Any
import os

from utils.ai_client import ai_client
from utils.file_parser import FileParser

router = APIRouter()

# In-memory storage for parsed CVs
cv_storage = {}

@router.post("/upload")
async def upload_cv(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Upload and parse a CV/resume file."""
    
    # Validate file type
    allowed_extensions = ['.pdf', '.docx']
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Please upload a PDF or DOCX file."
        )
    
    # Validate file size (max 10MB)
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size too large. Please upload a file smaller than 10MB."
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Save file
        file_path = await FileParser.save_uploaded_file(file_content, file.filename)
        
        # Parse the resume
        parsed_data = FileParser.parse_resume(file_path)
        
        # Generate AI analysis
        ai_analysis = await ai_client.analyze_text(parsed_data["raw_text"], "cv_analysis")
        
        # Extract skills
        skills = FileParser.extract_skills_from_text(parsed_data["raw_text"])
        
        # Create response data
        cv_id = str(len(cv_storage) + 1)  # Simple ID generation
        cv_data = {
            "id": cv_id,
            "filename": file.filename,
            "file_path": file_path,
            "parsed_data": parsed_data,
            "ai_analysis": ai_analysis,
            "extracted_skills": skills,
            "upload_timestamp": "2024-01-01T00:00:00Z"  # In production, use actual timestamp
        }
        
        # Store in memory (in production, save to database)
        cv_storage[cv_id] = cv_data
        
        return {
            "success": True,
            "cv_id": cv_id,
            "filename": file.filename,
            "analysis": {
                "structure": parsed_data["sections"],
                "ai_feedback": ai_analysis["analysis"],
                "extracted_skills": skills,
                "word_count": parsed_data["word_count"],
                "missing_sections": parsed_data["sections"]["missing_sections"]
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )

@router.get("/{cv_id}")
async def get_cv_analysis(cv_id: str) -> Dict[str, Any]:
    """Get analysis for a specific CV."""
    
    if cv_id not in cv_storage:
        raise HTTPException(
            status_code=404,
            detail="CV not found"
        )
    
    cv_data = cv_storage[cv_id]
    
    return {
        "cv_id": cv_id,
        "filename": cv_data["filename"],
        "analysis": {
            "structure": cv_data["parsed_data"]["sections"],
            "ai_feedback": cv_data["ai_analysis"]["analysis"],
            "extracted_skills": cv_data["extracted_skills"],
            "word_count": cv_data["parsed_data"]["word_count"],
            "missing_sections": cv_data["parsed_data"]["sections"]["missing_sections"]
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

@router.get("/list")
async def list_cvs() -> Dict[str, Any]:
    """List all uploaded CVs."""
    
    cv_list = []
    for cv_id, cv_data in cv_storage.items():
        cv_list.append({
            "id": cv_id,
            "filename": cv_data["filename"],
            "upload_timestamp": cv_data["upload_timestamp"],
            "word_count": cv_data["parsed_data"]["word_count"],
            "skills_count": len(cv_data["extracted_skills"])
        })
    
    return {
        "total_cvs": len(cv_list),
        "cvs": cv_list
    } 