from fastapi import APIRouter, HTTPException, Body, Request, status
from typing import Dict, Any, Optional
import re
import logging

from utils.ai_client import ai_client
from utils.translations import translator

router = APIRouter(tags=["Code Review"])
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
            You are an expert code reviewer. Your task is to analyze the provided code and provide a direct, actionable code review. 
            DO NOT explain what a code review is or provide examples. 
            DO NOT include any introductory text - start directly with the review.
            
            Analyze this code:
            ```
            {code}
            ```
            
            Generate a code review with these sections (include all sections even if brief):
            
            ## Code Summary (1-2 sentences)
            [Start directly with the summary]
            
            ## Detected Language
            [Language name]
            
            ## Strengths
            - [List specific strengths]
            
            ## Critical Issues
            - [List critical problems with line numbers]
            
            ## Improvements Needed
            - [List specific improvements with examples]
            
            ## Security Notes
            - [List security concerns if any]
            
            ## Performance Tips
            - [List optimization suggestions]
            
            ## Final Score: X/10
            [Brief justification]
            
            Format: Strict markdown with code blocks for examples.
            Language: {language}
            """
        
        # Format the prompt with the code and language
        prompt = prompt_template.format(code=code, language=language)
        
        try:
            logger.info(f"Sending code review request for {len(code)} characters of {language} code")
            
            # Add a clear instruction to the prompt
            final_prompt = f"""
            You are an expert code reviewer. Analyze the following code and provide a direct, actionable code review.
            DO NOT explain what a code review is or provide examples.
            DO NOT include any introductory text - start directly with the review.
            
            {prompt}
            
            IMPORTANT: Start your response directly with the code review content, without any introductory text.
            """.strip()
            
            # Get the response from the AI client
            response = await ai_client.generate_text(
                final_prompt, 
                language=language,
                temperature=0.3  # Lower temperature for more focused responses
            )
            
            # Clean up the response
            if response:
                # Remove any leading/trailing whitespace
                response = response.strip()
                # Remove any markdown code block markers that might wrap the entire response
                if response.startswith('```') and response.endswith('```'):
                    response = response[3:-3].strip()
                # Ensure the response starts with the expected format
                if not response.startswith('## '):
                    # Find the first heading and remove everything before it
                    match = re.search(r'## .+', response)
                    if match:
                        response = response[match.start():]
            
            logger.info(f"Received code review response: {response[:100]}..." if response else "Empty response received")
            
            return {
                "success": True,
                "review": response or "No review content generated",
                "detected_language": language
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