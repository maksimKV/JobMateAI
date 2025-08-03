from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional
from utils.ai_client import ai_client
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory storage for interview sessions (for MVP)
interview_sessions = {}

async def _generate_questions_by_type(job_description: str, question_type: str, count: int = 8) -> List[Dict[str, str]]:
    """Helper function to generate a specific number of questions of a given type."""
    try:
        questions_data = await ai_client.generate_interview_questions(
            job_description, 
            question_type,
            count=count
        )
        
        if isinstance(questions_data["questions"], str):
            # Split by newlines and clean up
            questions = [q.strip() for q in questions_data["questions"].split("\n") if q.strip()]
        else:
            questions = questions_data["questions"]
        
        # Ensure we don't return more questions than requested
        questions = questions[:count]
        
        return [{"text": q, "type": question_type} for q in questions if q]
    except Exception as e:
        logger.error(f"Error generating {question_type} questions: {str(e)}")
        return []

@router.post("/generate-questions")
async def generate_questions(
    job_description: str = Body(..., embed=True),
    interview_type: str = Body("hr", embed=True),  # 'hr', 'technical', or 'mixed'
    length: str = Body("medium", embed=True)  # 'short', 'medium', or 'long'
) -> Dict[str, Any]:
    """Generate interview questions based on job description, interview type, and length."""
    if interview_type not in ["hr", "technical", "mixed"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid interview type. Use 'hr', 'technical', or 'mixed'."
        )
    
    if length not in ["short", "medium", "long"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid length. Use 'short', 'medium', or 'long'."
        )
    
    try:
        session_id = str(len(interview_sessions) + 1)
        
        if interview_type == "mixed":
            # For mixed interviews, generate both HR and technical questions
            # based on the selected length
            hr_count = {"short": 4, "medium": 8, "long": 12}[length]
            tech_count = {"short": 4, "medium": 8, "long": 12}[length]
            
            hr_questions = await _generate_questions_by_type(job_description, "hr", hr_count)
            tech_questions = await _generate_questions_by_type(job_description, "technical", tech_count)
            
            # Interleave HR and technical questions
            questions = []
            for i in range(max(len(hr_questions), len(tech_questions))):
                if i < len(hr_questions):
                    questions.append(hr_questions[i])
                if i < len(tech_questions):
                    questions.append(tech_questions[i])
        else:
            # For single type interviews, generate questions based on length
            count = {"short": 4, "medium": 8, "long": 12}[length]
            questions = await _generate_questions_by_type(job_description, interview_type, count)
        
        if not questions:
            raise HTTPException(
                status_code=500, 
                detail="Failed to generate questions. Please try again."
            )
        
        # Store the session
        interview_sessions[session_id] = {
            "interview_type": interview_type,
            "questions": questions,
            "current_question_index": 0,
            "answers": [],
            "feedback": []
        }
        
        return {
            "success": True,
            "session_id": session_id,
            "interview_type": interview_type,
            "total_questions": len(questions),
            "current_question": questions[0]["text"] if questions else "",
            "question_type": questions[0]["type"] if questions else "",
            "question_number": 1
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in generate_questions: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"An error occurred while generating questions: {str(e)}"
        )

@router.post("/submit-answer")
async def submit_answer(
    session_id: str = Body(..., embed=True),
    answer: str = Body(..., embed=True)
) -> Dict[str, Any]:
    """Submit an answer to the current interview question and get feedback."""
    if session_id not in interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    session = interview_sessions[session_id]
    current_idx = session["current_question_index"]
    
    if current_idx >= len(session["questions"]):
        raise HTTPException(status_code=400, detail="No more questions in this session.")
    
    try:
        question_data = session["questions"][current_idx]
        question = question_data["text"]
        question_type = question_data["type"]
        
        # Get feedback for the answer
        feedback = await ai_client.evaluate_answer(question, answer, question_type)
        
        # Store the answer and feedback
        feedback_data = {
            "question": question,
            "answer": answer,
            "type": question_type,
            "evaluation": feedback.get("feedback", ""),
            "score": feedback.get("score", 0)  # Store the score for statistics
        }
        
        # Store in both answers and feedback arrays for backward compatibility
        session["answers"].append(feedback_data)
        session["feedback"].append(feedback_data)
        
        # Move to the next question
        next_idx = current_idx + 1
        session["current_question_index"] = next_idx
        
        # Prepare response
        response = {
            "success": True,
            "feedback": feedback,
            "is_complete": next_idx >= len(session["questions"])
        }
        
        # Add next question if available
        if next_idx < len(session["questions"]):
            next_question = session["questions"][next_idx]
            response.update({
                "next_question": next_question["text"],
                "question_type": next_question["type"],
                "question_number": next_idx + 1
            })
        
        return response
        
    except Exception as e:
        logger.error(f"Error in submit_answer: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"An error occurred while processing your answer: {str(e)}"
        )

@router.get("/session/{session_id}")
async def get_session(session_id: str) -> Dict[str, Any]:
    """Get the current state of an interview session."""
    if session_id not in interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    session = interview_sessions[session_id]
    current_idx = session["current_question_index"]
    total_questions = len(session["questions"])
    
    response = {
        "session_id": session_id,
        "interview_type": session["interview_type"],
        "total_questions": total_questions,
        "current_question_index": current_idx,
        "answers": session["answers"],
        "is_complete": current_idx >= total_questions
    }
    
    # Add current question if available
    if current_idx < total_questions:
        current_question = session["questions"][current_idx]
        response.update({
            "current_question": current_question["text"],
            "question_type": current_question["type"],
            "question_number": current_idx + 1
        })
    
    return response