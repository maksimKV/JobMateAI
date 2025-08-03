from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional
from datetime import datetime
from routers.interview_simulator import interview_sessions

router = APIRouter()

def calculate_scores(feedback: List[Dict[str, Any]], stage: str) -> Dict[str, Any]:
    """Calculate scores for the feedback."""
    hr_score = 0
    tech_theory_score = 0
    tech_practical_score = 0
    total_hr = 0
    total_tech_theory = 0
    total_tech_practical = 0
    
    for fb in feedback:
        if stage == "hr":
            # Calculate HR score based on feedback
            hr_score += fb.get('score', 7)  # Default to 7 if score not provided
            total_hr += 1
        else:
            # Calculate technical scores
            if "theory" in fb.get('question', '').lower():
                tech_theory_score += fb.get('score', 7)
                total_tech_theory += 1
            else:
                tech_practical_score += fb.get('score', 7)
                total_tech_practical += 1
    
    return {
        "hr_score": hr_score,
        "tech_theory_score": tech_theory_score,
        "tech_practical_score": tech_practical_score,
        "total_hr": total_hr,
        "total_tech_theory": total_tech_theory,
        "total_tech_practical": total_tech_practical
    }

@router.post("/charts")
async def get_statistics(
    session_id: str = Body(..., embed=True)
) -> Dict[str, Any]:
    """Return statistics for interview session including charts and full session data.
    
    If no session is found, returns default empty statistics instead of raising an error.
    """
    try:
        if session_id not in interview_sessions:
            # Return default empty statistics instead of raising an error
            return {
                "success": True,
                "message": "No active session found. Please start a new interview.",
                "has_data": False,
                "scores": {
                    "hr_score": 0,
                    "tech_theory_score": 0,
                    "tech_practical_score": 0,
                    "total_hr": 0,
                    "total_tech_theory": 0,
                    "total_tech_practical": 0
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
        
        session = interview_sessions.get(session_id, {})        
        feedback = session.get("feedback", [])
        questions = session.get("questions", [])
        stage = session.get("stage", "hr")
        interview_type = session.get("interview_type", "technical").lower()
                
        # Initialize scores with default values
        scores = {
            "hr_score": 0,
            "tech_theory_score": 0,
            "tech_practical_score": 0,
            "total_hr": 0,
            "total_tech_theory": 0,
            "total_tech_practical": 0
        }
        
        # Calculate scores if we have feedback
        if feedback:
            try:
                calculated_scores = calculate_scores(feedback, stage)
                                
                # Ensure calculated_scores is a dictionary and has all required keys
                if isinstance(calculated_scores, dict):
                    scores.update({
                        k: calculated_scores.get(k, 0) 
                        for k in scores.keys()
                    })
                else:
                    print(f"[WARNING] Expected dictionary but got {type(calculated_scores)}")
            except Exception as e:
                print(f"[ERROR] Error calculating scores: {str(e)}")
                import traceback
                traceback.print_exc()
    
    except Exception as e:
        error_msg = f"Unexpected error in get_statistics: {str(e)}"
        print(f"[ERROR] {error_msg}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": "An error occurred while processing your request.",
            "error": error_msg,
            "has_data": False,
            "scores": {
                "hr_score": 0,
                "tech_theory_score": 0,
                "tech_practical_score": 0,
                "total_hr": 0,
                "total_tech_theory": 0,
                "total_tech_practical": 0
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
    
    # Determine which types of questions we have
    # Safely access scores with .get() to avoid KeyError
    has_hr = stage == "hr" and scores.get("total_hr", 0) > 0
    has_tech_theory = stage == "technical" and scores.get("total_tech_theory", 0) > 0
    has_tech_practical = stage == "technical" and scores.get("total_tech_practical", 0) > 0
    has_tech = has_tech_theory or has_tech_practical
    
    # Prepare questions and feedback for the response
    session_data = []
    for idx, (question, fb) in enumerate(zip(questions, feedback)):
        question_type = "HR" if stage == "hr" else ("Technical Theory" if "theory" in question.lower() else "Technical Practical")
        session_data.append({
            "question_number": idx + 1,
            "question": question,
            "answer": fb.get("answer", ""),
            "feedback": fb.get("evaluation", ""),
            "score": fb.get("score", 0),
            "type": question_type
        })
    
    # Initialize charts as None - will be populated only if there's data
    bar_chart = None
    pie_chart = None
    line_chart = None
    
    # Only create bar chart if we have at least one type of questions
    if has_hr or has_tech:
        bar_labels = []
        bar_data = []
        bar_background_colors = []
        bar_border_colors = []
        
        if has_hr:
            bar_labels.append("HR")
            bar_data.append(scores["hr_score"])
            bar_background_colors.append("#4f46e5")
            bar_border_colors.append("#4338ca")
            
        if has_tech:
            bar_labels.append("Technical")
            bar_data.append(scores["tech_theory_score"] + scores["tech_practical_score"])
            bar_background_colors.append("#10b981")
            bar_border_colors.append("#0d9488")
        
        bar_chart = {
            "labels": bar_labels,
            "datasets": [{
                "label": "Performance Score",
                "data": bar_data,
                "backgroundColor": bar_background_colors,
                "borderColor": bar_border_colors,
                "borderWidth": 1
            }]
        }
    
    # Only create pie chart if we have technical questions
    if has_tech and (has_tech_theory or has_tech_practical):
        pie_labels = []
        pie_data = []
        pie_background_colors = []
        pie_border_colors = []
        
        if has_tech_theory:
            pie_labels.append("Theory")
            pie_data.append(scores["tech_theory_score"])
            pie_background_colors.append("#f59e0b")
            pie_border_colors.append("#d97706")
            
        if has_tech_practical:
            pie_labels.append("Practical")
            pie_data.append(scores["tech_practical_score"])
            pie_background_colors.append("#3b82f6")
            pie_border_colors.append("#2563eb")
            
        # Only create pie chart if we have at least one category with data
        if len(pie_labels) > 1:  # Need at least 2 categories for a meaningful pie chart
            pie_chart = {
                "labels": pie_labels,
                "datasets": [{
                    "data": pie_data,
                    "backgroundColor": pie_background_colors,
                    "borderColor": pie_border_colors,
                    "borderWidth": 1
                }]
            }
    
    # Line chart: Progress over questions (only if we have questions with scores)
    if questions and feedback and len(questions) == len(feedback):
        # Only create line chart if we have scores
        question_scores = [float(fb.get("score", 0)) for fb in feedback if fb.get("score") is not None]
        
        if question_scores:  # Only create chart if we have at least one score
            line_chart = {
                "labels": [f"Q{i+1}" for i in range(len(questions))],
                "datasets": [{
                    "label": "Score per Question",
                    "data": [fb.get("score", 0) for fb in feedback],
                    "fill": False,
                    "borderColor": "#8b5cf6",
                    "tension": 0.3
                }]
            }
    
    # Prepare response
    response = {
        "success": True,
        "metadata": {
            "has_hr": has_hr,
            "has_technical": has_tech,
            "has_tech_theory": has_tech_theory,
            "has_tech_practical": has_tech_practical,
            "total_questions": len(questions)
        },
        "session": {
            "id": session_id,
            "stage": stage,
            "interview_type": interview_type,
            "timestamp": session.get("timestamp", datetime.utcnow().isoformat()),
            "questions": questions,
            "feedback": feedback
        },
        "scores": {
            "overall": {
                "total": sum(fb.get("score", 0) for fb in feedback),
                "average": sum(fb.get("score", 0) for fb in feedback) / len(feedback) if feedback else 0,
                "max_possible": len(feedback) * 10  # Assuming max score of 10 per question
            },
            "by_category": {}
        },
        "charts": {}
    }
    
    # Only include categories that have data
    if has_hr:
        response["scores"]["by_category"]["hr"] = {
            "score": scores.get("hr_score", 0),
            "total_questions": scores.get("total_hr", 0),
            "average": scores.get("hr_score", 0) / scores.get("total_hr", 1) if scores.get("total_hr", 0) > 0 else 0
        }
    
    if has_tech_theory:
        response["scores"]["by_category"]["tech_theory"] = {
            "score": scores.get("tech_theory_score", 0),
            "total_questions": scores.get("total_tech_theory", 0),
            "average": scores.get("tech_theory_score", 0) / scores.get("total_tech_theory", 1) if scores.get("total_tech_theory", 0) > 0 else 0
        }
        
    if has_tech_practical:
        response["scores"]["by_category"]["tech_practical"] = {
            "score": scores["tech_practical_score"],
            "total_questions": scores["total_tech_practical"],
            "average": scores["tech_practical_score"] / scores["total_tech_practical"] if scores["total_tech_practical"] > 0 else 0
        }
    
    # Only include charts that have data
    if bar_chart:
        response["charts"]["bar_chart"] = bar_chart
    if pie_chart:
        response["charts"]["pie_chart"] = pie_chart
    if line_chart:
        response["charts"]["line_chart"] = line_chart
    
    return response