from fastapi import APIRouter, HTTPException, Body, Request, status
from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime
import logging
import statistics

from routers.interview_simulator import interview_sessions
from utils.translations import translator

# Configuration constants
DEFAULT_SCORE = 7.0  # Default score when none is provided
MIN_SCORE = 0.0       # Minimum allowed score
MAX_SCORE = 10.0      # Maximum allowed score

router = APIRouter(tags=["Statistics"])
logger = logging.getLogger(__name__)

def _calculate_averages(scores: List[float]) -> Tuple[float, float, float]:
    """Calculate min, max, and average scores from a list of scores.
    
    Args:
        scores: List of numerical scores
        
    Returns:
        Tuple of (average, min, max) scores
    """
    if not scores:
        return 0.0, 0.0, 0.0
    return (
        round(statistics.mean(scores), 1),
        min(scores),
        max(scores)
    )

def _validate_feedback_item(fb: Dict[str, Any]) -> Tuple[bool, Optional[float], str]:
    """Validate a single feedback item and extract score and type.
    
    Args:
        fb: Feedback dictionary containing score and type
        
    Returns:
        Tuple of (is_valid, score, question_type)
    """
    if not isinstance(fb, dict):
        return False, None, ""
    
    try:
        # Get and validate score
        score = float(fb.get('score', DEFAULT_SCORE))
        if not (MIN_SCORE <= score <= MAX_SCORE):
            logger.warning(f"Score {score} out of valid range ({MIN_SCORE}-{MAX_SCORE})")
            return False, None, ""
            
        # Get and normalize question type
        question_type = str(fb.get('type', '')).lower().strip()
        return True, score, question_type
        
    except (ValueError, TypeError) as e:
        logger.warning(f"Invalid score format in feedback item: {e}")
        return False, None, ""

def calculate_scores(
    feedback: List[Dict[str, Any]], 
    interview_type: str, 
    language: str = 'en'
) -> Dict[str, Any]:
    """Calculate scores for the feedback based on interview type.
    
    Args:
        feedback: List of feedback dictionaries with 'score' and 'type' keys
        interview_type: Type of interview ('hr', 'technical', 'non_technical', 'mixed')
        language: Language code for the response (e.g., 'en', 'bg')
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating if calculation was successful
        - message: Status message
        - scores: Dictionary with calculated metrics
    """
    if not feedback or not isinstance(feedback, list):
        return {
            "success": False,
            "message": translator.get("errors.no_feedback_data", language),
            "scores": {}
        }
    
    # Initialize score trackers
    hr_scores: List[float] = []
    tech_theory_scores: List[float] = []
    tech_practical_scores: List[float] = []
    non_tech_scores: List[float] = []
    
    # Track invalid feedback items
    invalid_count = 0
    
    # Categorize feedback by type
    for fb in feedback:
        is_valid, score, question_type = _validate_feedback_item(fb)
        if not is_valid:
            invalid_count += 1
            continue
            
        # Categorize the score
        if question_type == 'hr':
            hr_scores.append(score)
        elif question_type == 'non_technical':
            non_tech_scores.append(score)
        elif question_type == 'technical':
            # For backward compatibility, split technical questions 50/50 between theory and practical
            if len(tech_theory_scores) <= len(tech_practical_scores):
                tech_theory_scores.append(score)
            else:
                tech_practical_scores.append(score)
        elif question_type == 'technical_theory':
            tech_theory_scores.append(score)
        elif question_type == 'technical_practical':
            tech_practical_scores.append(score)
    
    # Log any invalid feedback items
    if invalid_count > 0:
        logger.warning(f"Skipped {invalid_count} invalid feedback items")
    
    # Calculate statistics for each category
    hr_avg, hr_min, hr_max = _calculate_averages(hr_scores)
    theory_avg, theory_min, theory_max = _calculate_averages(tech_theory_scores)
    practical_avg, practical_min, practical_max = _calculate_averages(tech_practical_scores)
    non_tech_avg, non_tech_min, non_tech_max = _calculate_averages(non_tech_scores)
    
    # Calculate overall score based on interview type
    if interview_type == 'hr':
        overall_scores = hr_scores + non_tech_scores
    elif interview_type == 'technical':
        overall_scores = tech_theory_scores + tech_practical_scores
    elif interview_type == 'non_technical':
        overall_scores = non_tech_scores
    else:  # mixed
        overall_scores = hr_scores + tech_theory_scores + tech_practical_scores + non_tech_scores
    
    overall_avg, overall_min, overall_max = _calculate_averages(overall_scores)
    
    return {
        "success": True,
        "overall_score": overall_avg,
        "overall_min": overall_min,
        "overall_max": overall_max,
        "hr_score": hr_avg,
        "hr_min": hr_min,
        "hr_max": hr_max,
        "tech_theory_score": theory_avg,
        "tech_theory_min": theory_min,
        "tech_theory_max": theory_max,
        "tech_practical_score": practical_avg,
        "tech_practical_min": practical_min,
        "tech_practical_max": practical_max,
        "non_tech_score": non_tech_avg,
        "non_tech_min": non_tech_min,
        "non_tech_max": non_tech_max,
        "total_hr": len(hr_scores),
        "total_tech_theory": len(tech_theory_scores),
        "total_tech_practical": len(tech_practical_scores),
        "total_non_tech": len(non_tech_scores),
        "interview_type": interview_type,
        "language": language
    }

@router.post("/scores")
async def get_scores(
    request: Request,
    feedback: List[Dict[str, Any]] = Body(..., embed=True, description="List of feedback items with scores"),
    interview_type: str = Body("mixed", embed=True, description="Type of interview: 'hr', 'technical', 'non_technical', or 'mixed'"),
    language: Optional[str] = Body(None, embed=True, description="Language code for the response (e.g., 'en', 'bg')")
) -> Dict[str, Any]:
    """
    Calculate and return scores for the given feedback.
    
    Args:
        feedback: List of feedback items with scores and question types
        interview_type: Type of interview ('hr', 'technical', 'non_technical', 'mixed')
        language: Language code for the response
        
    Returns:
        Dictionary containing calculated scores and metrics
    """
    # Get language from request if not provided
    req_language = getattr(request.state, 'language', 'en')
    language = language or req_language
    
    if not feedback:
        error_msg = translator.get("errors.no_feedback_data", language)
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    if interview_type not in ['hr', 'technical', 'non_technical', 'mixed']:
        error_msg = translator.get("errors.invalid_interview_type", language, type=interview_type)
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    try:
        scores = calculate_scores(feedback, interview_type, language)
        
        if not scores.get('success', True):
            logger.error(f"Failed to calculate scores: {scores.get('message', 'Unknown error')}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=scores.get('message', 'Failed to calculate scores')
            )
            
        # Add success message and language to response
        scores["message"] = translator.get("success.scores_calculated", language)
        return scores
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating scores: {str(e)}", exc_info=True)
        error_msg = translator.get(
            "errors.score_calculation_failed", 
            language, 
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )

@router.post("/charts")
async def get_statistics(
    session_id: str = Body(..., embed=True)
) -> Dict[str, Any]:
    """Return statistics for interview session including charts and full session data.
    
    If no session is found, returns default empty statistics instead of raising an error.
    """
    default_response = {
        "success": True,
        "message": "No active session found. Please start a new interview.",
        "has_data": False,
        "scores": {
            "hr_score": 0,
            "tech_theory_score": 0,
            "tech_practical_score": 0,
            "non_tech_score": 0,
            "total_hr": 0,
            "total_tech_theory": 0,
            "total_tech_practical": 0,
            "total_non_tech": 0
        },
        "charts": {
            "line_chart": {
                "labels": [],
                "datasets": []
            },
            "radar_chart": {
                "labels": [],
                "datasets": []
            }
        }
    }
    
    try:
        if session_id not in interview_sessions:
            return default_response
        
        session = interview_sessions.get(session_id, {})        
        feedback = session.get("feedback", [])
        questions = session.get("questions", [])
        interview_type = session.get("interview_type", "technical").lower()
        
        # Initialize scores with default values
        scores = {
            "hr_score": 0,
            "tech_theory_score": 0,
            "tech_practical_score": 0,
            "non_tech_score": 0,
            "total_hr": 0,
            "total_tech_theory": 0,
            "total_tech_practical": 0,
            "total_non_tech": 0
        }
        
        # Calculate scores if we have feedback
        if feedback:
            try:
                calculated_scores = calculate_scores(feedback, interview_type)
                scores.update(calculated_scores)
            except Exception as e:
                print(f"[ERROR] Error calculating scores: {str(e)}")
                import traceback
                traceback.print_exc()
        
        # Determine which types of questions we have
        has_hr = scores["total_hr"] > 0
        has_tech_theory = scores["total_tech_theory"] > 0
        has_tech_practical = scores["total_tech_practical"] > 0
        has_non_tech = scores["total_non_tech"] > 0
        has_tech = has_tech_theory or has_tech_practical
        
        # Prepare questions and feedback for the response
        session_data = []
        for idx, (question, fb) in enumerate(zip(questions, feedback)):
            # Determine question type
            if interview_type == 'hr':
                question_type = "HR"
            elif interview_type == 'non_technical':
                question_type = "Non-Technical"
            elif interview_type == 'technical':
                question_type = "Technical Theory" if "theory" in str(question).lower() else "Technical Practical"
            else:  # mixed
                question_type = fb.get('type', 'Unknown')
                
            session_data.append({
                "question_number": idx + 1,
                "question": question if isinstance(question, str) else question.get("text", ""),
                "answer": fb.get("answer", ""),
                "feedback": fb.get("evaluation", ""),
                "score": fb.get("score", 0),
                "type": question_type
            })
        
        # Prepare chart data
        bar_chart = None
        if has_hr or has_tech or has_non_tech:
            bar_labels = []
            bar_data = []
            bar_background_colors = []
            bar_border_colors = []
            
            if has_hr:
                bar_labels.append("HR")
                bar_data.append(scores["hr_score"] / max(1, scores["total_hr"]))
                bar_background_colors.append("#4f46e5")
                bar_border_colors.append("#4338ca")
                
            if has_tech:
                bar_labels.append("Technical")
                tech_total = (scores["tech_theory_score"] + scores["tech_practical_score"])
                tech_count = max(1, scores["total_tech_theory"] + scores["total_tech_practical"])
                bar_data.append(tech_total / tech_count)
                bar_background_colors.append("#10b981")
                bar_border_colors.append("#0d9488")
                
            if has_non_tech:
                bar_labels.append("Non-Technical")
                bar_data.append(scores["non_tech_score"] / max(1, scores["total_non_tech"]))
                bar_background_colors.append("#f59e0b")
                bar_border_colors.append("#d97706")
            
            bar_chart = {
                "labels": bar_labels,
                "datasets": [{
                    "label": "Average Score",
                    "data": bar_data,
                    "backgroundColor": bar_background_colors,
                    "borderColor": bar_border_colors,
                    "borderWidth": 1
                }]
            }
        
        # Prepare response
        response = {
            "success": True,
            "has_data": len(feedback) > 0,
            "message": "Statistics retrieved successfully",
            "scores": scores,
            "session": {
                "id": session_id,
                "stage": interview_type,
                "interview_type": interview_type,
                "timestamp": datetime.now().isoformat(),
                "questions": [q if isinstance(q, str) else q.get("text", "") for q in questions],
                "feedback": feedback
            },
            "charts": {
                "bar_chart": bar_chart,
                # Other charts can be added here
            }
        }
        
        return response
        
    except Exception as e:
        error_msg = f"Unexpected error in get_statistics: {str(e)}"
        print(f"[ERROR] {error_msg}")
        import traceback
        traceback.print_exc()
        
        # Return default response with error details
        default_response.update({
            "success": False,
            "message": f"An error occurred: {str(e)}",
            "error": error_msg
        })
        return default_response