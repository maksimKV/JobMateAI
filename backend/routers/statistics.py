from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional
from datetime import datetime
from routers.interview_simulator import interview_sessions

router = APIRouter()

def calculate_scores(feedback: List[Dict[str, Any]], interview_type: str) -> Dict[str, Any]:
    """Calculate scores for the feedback based on interview type.
    
    Args:
        feedback: List of feedback dictionaries
        interview_type: Type of interview ('hr', 'technical', 'non_technical', 'mixed')
    """
    hr_score = 0
    tech_theory_score = 0
    tech_practical_score = 0
    non_tech_score = 0
    total_hr = 0
    total_tech_theory = 0
    total_tech_practical = 0
    total_non_tech = 0
    
    for fb in feedback:
        question_type = fb.get('type', '').lower()
        score = fb.get('score', 7)  # Default to 7 if score not provided
        
        if interview_type == 'hr':
            hr_score += score
            total_hr += 1
        elif interview_type == 'non_technical':
            non_tech_score += score
            total_non_tech += 1
        elif interview_type == 'technical':
            if "theory" in fb.get('question', '').lower():
                tech_theory_score += score
                total_tech_theory += 1
            else:
                tech_practical_score += score
                total_tech_practical += 1
        elif interview_type == 'mixed':
            if question_type == 'hr':
                hr_score += score
                total_hr += 1
            elif 'theory' in question_type:
                tech_theory_score += score
                total_tech_theory += 1
            elif 'practical' in question_type:
                tech_practical_score += score
                total_tech_practical += 1
            elif 'non_technical' in question_type:
                non_tech_score += score
                total_non_tech += 1
    
    return {
        "hr_score": hr_score,
        "tech_theory_score": tech_theory_score,
        "tech_practical_score": tech_practical_score,
        "non_tech_score": non_tech_score,
        "total_hr": total_hr,
        "total_tech_theory": total_tech_theory,
        "total_tech_practical": total_tech_practical,
        "total_non_tech": total_non_tech
    }

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