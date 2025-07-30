from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from utils.ai_client import ai_client
import re

router = APIRouter()

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
    code: str = Body(..., embed=True)
) -> Dict[str, Any]:
    """Review code and provide summary, bug detection, optimization, and readability tips. Language is detected automatically."""
    if not code.strip():
        raise HTTPException(status_code=400, detail="No code provided.")
    try:
        language = detect_language(code)
        prompt = f"""
        Review the following code. Detect the programming language automatically. Provide:
        1. The detected language
        2. A summary of what the code does
        3. Possible bugs or issues
        4. Optimization tips
        5. Readability improvements
        6. Security considerations (if any)
        
        Code:
        {code}
        
        Respond in a structured format.
        """
        review = await ai_client.generate_text(prompt, max_tokens=1200, temperature=0.4)
        return {
            "success": True,
            "review": review,
            "detected_language": language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reviewing code: {str(e)}")