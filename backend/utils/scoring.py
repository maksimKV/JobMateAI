"""
Scoring utilities for the JobMateAI application.

This module provides helper functions for calculating scores and metrics
used throughout the application.
"""
from typing import List, Dict, Any


def calculate_average_score(answers: List[Dict[str, Any]]) -> float:
    """
    Calculate the average score from a list of answers with feedback.
    
    Args:
        answers: List of answer dictionaries, each possibly containing a 
                'feedback' dict with 'score'
        
    Returns:
        Average score as a float, or 0.0 if no valid scores found
    """
    if not answers:
        return 0.0
    
    total_score = 0.0
    scored_answers = 0
    
    for answer in answers:
        if not isinstance(answer, dict) or "feedback" not in answer:
            continue
            
        feedback = answer["feedback"]
        if not isinstance(feedback, dict) or "score" not in feedback:
            continue
            
        try:
            score = float(feedback["score"])
            if 0 <= score <= 10:  # Assuming score is out of 10
                total_score += score
                scored_answers += 1
        except (TypeError, ValueError):
            continue
    
    return round(total_score / scored_answers, 1) if scored_answers > 0 else 0.0
