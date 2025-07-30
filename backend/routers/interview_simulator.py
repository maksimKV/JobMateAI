from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List
from utils.ai_client import ai_client

router = APIRouter()

# In-memory storage for interview sessions (for MVP)
interview_sessions = {}

@router.post("/generate-questions")
async def generate_questions(
    job_description: str = Body(..., embed=True),
    stage: str = Body("hr", embed=True)  # 'hr' or 'technical'
) -> Dict[str, Any]:
    """Generate interview questions based on job description and stage."""
    if stage not in ["hr", "technical"]:
        raise HTTPException(status_code=400, detail="Invalid stage. Use 'hr' or 'technical'.")
    try:
        questions_data = await ai_client.generate_interview_questions(job_description, stage)
        # Store questions in a session (simple in-memory, for MVP)
        session_id = str(len(interview_sessions) + 1)
        interview_sessions[session_id] = {
            "stage": stage,
            "questions": questions_data["questions"],
            "answers": [],
            "feedback": []
        }
        return {
            "success": True,
            "session_id": session_id,
            "questions": questions_data["questions"],
            "stage": stage
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating questions: {str(e)}")

@router.post("/submit-answer")
async def submit_answer(
    session_id: str = Body(..., embed=True),
    question: str = Body(..., embed=True),
    answer: str = Body(..., embed=True),
    question_type: str = Body("hr", embed=True)
) -> Dict[str, Any]:
    """Submit an answer to an interview question and get feedback."""
    if session_id not in interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        feedback = await ai_client.evaluate_answer(question, answer, question_type)
        # Store answer and feedback
        interview_sessions[session_id]["answers"].append({"question": question, "answer": answer})
        interview_sessions[session_id]["feedback"].append(feedback)
        return {
            "success": True,
            "feedback": feedback
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error evaluating answer: {str(e)}")

@router.get("/session/{session_id}")
async def get_session(session_id: str) -> Dict[str, Any]:
    """Get all questions, answers, and feedback for a session."""
    if session_id not in interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found.")
    session = interview_sessions[session_id]
    return {
        "session_id": session_id,
        "stage": session["stage"],
        "questions": session["questions"],
        "answers": session["answers"],
        "feedback": session["feedback"]
    }