from fastapi import APIRouter, HTTPException, Body, Request, status
from typing import Dict, Any, Optional
import re
import logging

from utils.ai_client import ai_client
from utils.translations import translator

router = APIRouter(prefix="/api/code-review", tags=["Code Review"])
logger = logging.getLogger(__name__)

def detect_language(code: str) -> str:
    """Very basic language detection based on code patterns."""
    patterns = [
        (r'\bdef\b|import\s+os|print\(', 'Python'),
        (r'function\s+\w+\(|console\.log|let\s|const\s|var\s', 'JavaScript'),
        (r'<\?php|echo\s|\$\w+', 'PHP'),
        (r'#include\s+<|std::|cout\s*<<', 'C++'),
        (r'public\s+static\s+void\s+main|System\.out\.println', 'Java'),
        (r'using\s+System;|Console\.WriteLine', 'C#'),
        (r'func\s+\w+\(|package\s+main', 'Go'),
        (r'fn\s+\w+\(|let\s+\w+\s*=\s*', 'Rust'),
        (r'class\s+\w+\s*\{', 'TypeScript'),
        (r'<html>|<div>|<span>', 'HTML'),
        (r'body\s*\{|color:\s*', 'CSS'),
    ]
    for pattern, lang in patterns:
        if re.search(pattern, code, re.IGNORECASE):
            return lang
    return 'Unknown'

@router.post("/review")
async def review_code(
    request: Request,
    code: str = Body(..., embed=True, description="Source code to review"),
    language: Optional[str] = Body(None, embed=True, description="Language code for the response (e.g., 'en', 'bg')")
) -> Dict[str, Any]:
    """
    Review code and provide summary, bug detection, optimization, and readability tips.
    Programming language is detected automatically.
    
    Args:
        code: Source code to review
        language: Language code for the response (e.g., 'en', 'bg')
        
    Returns:
        Dictionary containing code review results
    """
    # Get language from request if not provided
    req_language = getattr(request.state, 'language', 'en')
    language = language or req_language
    
    if not code.strip():
        error_msg = translator.get("errors.no_code_provided", language)
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    try:
        language = detect_language(code)
        # Get localized prompt template
        prompt_template = translator.get("prompts.code_review", language)
        
        # If no specific template found, use default
        if not prompt_template:
            prompt_template = """
            Review the following code. Detect the programming language automatically. Provide:
            1. The detected language
            2. A summary of what the code does
            3. Possible bugs or issues
            4. Optimization tips
            5. Readability improvements
            6. Security considerations (if any)
            
            Code:
            {code}
            
            Respond in a structured format in {language} language.
            """
        
        prompt = prompt_template.format(code=code, language=language)
        try:
            response = await ai_client.generate_text(prompt, language=language)
            
            return {
                "success": True,
                "message": translator.get("success.code_review_completed", language),
                "review": response,
                "detected_language": language,
                "language": language
            }
            
        except Exception as e:
            logger.error(f"Error generating code review: {str(e)}", exc_info=True)
            error_msg = translator.get(
                "errors.code_review_failed", 
                language, 
                error=str(e)
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reviewing code: {str(e)}")