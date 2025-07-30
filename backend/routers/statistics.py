from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List
from routers.interview_simulator import interview_sessions

router = APIRouter()

@router.post("/charts")
async def get_statistics(
    session_id: str = Body(..., embed=True)
) -> Dict[str, Any]:
    """Return statistics for interview session as chart data."""
    if session_id not in interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found.")
    session = interview_sessions[session_id]
    feedback = session["feedback"]
    # For MVP, fake some scoring logic based on feedback text
    hr_score = 0
    tech_theory_score = 0
    tech_practical_score = 0
    total_hr = 0
    total_tech_theory = 0
    total_tech_practical = 0
    for fb in feedback:
        if session["stage"] == "hr":
            hr_score += 7  # Placeholder
            total_hr += 1
        else:
            # Try to split theory vs practical by keyword
            if "theory" in fb["question"].lower():
                tech_theory_score += 7
                total_tech_theory += 1
            else:
                tech_practical_score += 7
                total_tech_practical += 1
    # Bar chart: HR vs Technical
    bar_chart = {
        "labels": ["HR", "Technical"],
        "datasets": [{
            "label": "Performance Score",
            "data": [hr_score, tech_theory_score + tech_practical_score]
        }]
    }
    # Pie chart: Theory vs Practical (technical only)
    pie_chart = {
        "labels": ["Theory", "Practical"],
        "datasets": [{
            "data": [tech_theory_score, tech_practical_score]
        }]
    }
    return {
        "success": True,
        "bar_chart": bar_chart,
        "pie_chart": pie_chart
    }