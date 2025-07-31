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
    """Return statistics for interview session including charts and full session data."""
    if session_id not in interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    session = interview_sessions[session_id]
    feedback = session.get("feedback", [])
    questions = session.get("questions", [])
    stage = session.get("stage", "hr")
    
    # Calculate scores
    scores = calculate_scores(feedback, stage)
    
    # Prepare questions and feedback for the response
    session_data = []
    for idx, (question, fb) in enumerate(zip(questions, feedback)):
        session_data.append({
            "question_number": idx + 1,
            "question": question,
            "answer": fb.get("answer", ""),
            "feedback": fb.get("evaluation", ""),
            "score": fb.get("score", 0),
            "type": "HR" if stage == "hr" else ("Technical Theory" if "theory" in question.lower() else "Technical Practical")
        })
    
    # Bar chart: HR vs Technical
    bar_chart = {
        "labels": ["HR", "Technical"],
        "datasets": [{
            "label": "Performance Score",
            "data": [
                scores["hr_score"], 
                scores["tech_theory_score"] + scores["tech_practical_score"]
            ],
            "backgroundColor": ["#4f46e5", "#10b981"],
            "borderColor": ["#4338ca", "#0d9488"],
            "borderWidth": 1
        }]
    }
    
    # Pie chart: Theory vs Practical (technical only)
    pie_chart = {
        "labels": ["Theory", "Practical"],
        "datasets": [{
            "data": [scores["tech_theory_score"], scores["tech_practical_score"]],
            "backgroundColor": ["#f59e0b", "#3b82f6"],
            "borderColor": ["#d97706", "#2563eb"],
            "borderWidth": 1
        }]
    }
    
    # Line chart: Progress over questions
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
    
    return {
        "success": True,
        "session": {
            "id": session_id,
            "stage": stage,
            "timestamp": session.get("timestamp", datetime.utcnow().isoformat()),
            "questions": questions,
            "feedback": feedback,
            "interviewType": session.get("interview_type", "Technical").capitalize()
        },
        "scores": {
            "overall": {
                "total": sum(fb.get("score", 0) for fb in feedback),
                "average": sum(fb.get("score", 0) for fb in feedback) / len(feedback) if feedback else 0,
                "max_possible": len(feedback) * 10  # Assuming max score of 10 per question
            },
            "by_category": {
                "hr": {
                    "score": scores["hr_score"],
                    "total_questions": scores["total_hr"]
                },
                "tech_theory": {
                    "score": scores["tech_theory_score"],
                    "total_questions": scores["total_tech_theory"]
                },
                "tech_practical": {
                    "score": scores["tech_practical_score"],
                    "total_questions": scores["total_tech_practical"]
                }
            }
        },
        "charts": {
            "bar_chart": bar_chart,
            "pie_chart": pie_chart,
            "line_chart": line_chart
        }
    }