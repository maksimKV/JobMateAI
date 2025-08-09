from fastapi import APIRouter, HTTPException, Body, Request, status, Depends
from typing import Dict, Any, List, Optional, Tuple
import logging
import uuid
import time

from utils.ai_client import ai_client
from utils.translations import translator
from utils.scoring import calculate_average_score

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Interview Simulator"])

# In-memory storage for interview sessions (for MVP)
interview_sessions = {}

def get_request_language(request: Request) -> str:
    """Helper to get language from request state"""
    return getattr(request.state, 'language', 'en')

async def _generate_questions_by_type(
    job_description: str, 
    question_type: str, 
    count: int = 8,
    language: str = 'en'
) -> List[Dict[str, str]]:
    """
    Helper function to generate a specific number of questions of a given type.
    
    Args:
        job_description: The job description to base questions on
        question_type: Type of questions to generate (e.g., 'technical', 'behavioral')
        count: Number of questions to generate
        language: Language code for the questions
        
    Returns:
        List of question dictionaries with text and type
    """
    try:
        questions_data = await ai_client.generate_interview_questions(
            job_description=job_description,
            question_type=question_type,
            count=count
        )
        
        questions = []
        if isinstance(questions_data, dict) and "questions" in questions_data:
            if isinstance(questions_data["questions"], str):
                # Handle string response (split by newlines)
                questions = [
                    q.strip() 
                    for q in questions_data["questions"].split("\n") 
                    if q.strip()
                ]
            elif isinstance(questions_data["questions"], list):
                questions = questions_data["questions"]
        
        # Ensure we don't return more questions than requested
        questions = questions[:count]
        
        return [{"text": q, "type": question_type} for q in questions if q]
        
    except Exception as e:
        logger.error(f"Error generating {question_type} questions: {str(e)}", exc_info=True)
        return []

@router.post("/generate-questions")
async def generate_questions(
    request: Request,
    job_description: str = Body(..., embed=True, description="Job description to base questions on"),
    interview_type: str = Body("non_technical", embed=True, description="Type of interview: 'hr', 'technical', 'mixed', or 'non_technical'"),
    length: str = Body("medium", embed=True, description="Interview length: 'short', 'medium', or 'long'"),
    language: Optional[str] = Body(None, embed=True, description="Language code (e.g., 'en', 'bg')")
) -> Dict[str, Any]:
    """
    Generate interview questions based on job description, interview type, and length.
    
    Args:
        job_description: The job description to base questions on
        interview_type: Type of interview questions to generate
        length: Desired length of the interview
        language: Language code for the questions (defaults to request language)
        
    Returns:
        Dictionary containing the generated questions and session ID
    """
    # Get language from request if not provided
    req_language = get_request_language(request)
    language = language or req_language
    
    logger.info(f"Generating {interview_type} interview questions in {language} (length: {length})")
    
    # Validate input
    if not job_description.strip():
        error_msg = translator.get("errors.missing_job_description", language)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    valid_interview_types = ["hr", "technical", "mixed", "non_technical"]
    if interview_type not in valid_interview_types:
        error_msg = translator.get(
            "errors.invalid_interview_type", 
            language,
            valid_types=", ".join(valid_interview_types)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=error_msg
        )
    
    valid_lengths = ["short", "medium", "long"]
    if length not in valid_lengths:
        error_msg = translator.get(
            "errors.invalid_interview_length",
            language,
            valid_lengths=", ".join(valid_lengths)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    try:
        session_id = str(len(interview_sessions) + 1)
        
        if interview_type == "mixed":
            # For mixed interviews, generate both HR and technical questions
            hr_count = {"short": 4, "medium": 8, "long": 12}[length]
            tech_count = {"short": 4, "medium": 8, "long": 12}[length]
            
            hr_questions = await _generate_questions_by_type(job_description, "hr", hr_count, language)
            tech_questions = await _generate_questions_by_type(job_description, "technical", tech_count, language)
            
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
            questions = await _generate_questions_by_type(job_description, interview_type, count, language)
        
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Failed to generate questions. Please try again."
            )
        
        # Extract company name and position from job description
        job_info = await ai_client.extract_job_info(job_description)
        
        # Log extraction results and handle potential issues
        if not job_info.get("_extraction_success", False):
            logger.warning(
                "Job info extraction may be incomplete. Errors: %s",
                job_info.get("_extraction_errors", ["Unknown error"])
            )
        
        # Prepare session data with only necessary fields
        session_data = {
            "interview_type": interview_type,
            "company_name": job_info.get("company_name", "Company"),
            "position": job_info.get("position", "Position"),
            "job_description": job_description,  # Store the original job description
            "questions": questions,
            "current_question_index": 0,
            "answers": [],
            "feedback": [],
            "start_time": time.time(),
            "language": language,
            "job_info_extraction_success": job_info.get("_extraction_success", False)
        }
        
        # Add detected role and domain for non_technical interviews
        if interview_type == "non_technical" and hasattr(questions[0], 'get'):
            session_data.update({
                "detected_role": questions[0].get("detected_role", "Professional Role"),
                "detected_domain": questions[0].get("detected_domain", "General Business")
            })
        
        # Store the session
        interview_sessions[session_id] = session_data
        
        # Prepare response
        response = {
            "success": True,
            "session_id": session_id,
            "interview_type": interview_type,
            "total_questions": len(questions),
            "current_question": questions[0]["text"] if questions else "",
            "question_type": questions[0]["type"] if questions else "",
            "question_number": 1
        }
        
        # Add company name and position to response
        response.update({
            "company_name": session_data["company_name"],
            "position": session_data["position"]
        })
        
        # Add detected role and domain to response for non_technical interviews
        if interview_type == "non_technical":
            response.update({
                "detected_role": session_data.get("detected_role", "Professional Role"),
                "detected_domain": session_data.get("detected_domain", "General Business")
            })
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in generate_questions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"An error occurred while generating questions: {str(e)}"
        )

@router.post("/submit-answer")
async def submit_answer(
    request: Request,
    session_id: str = Body(..., embed=True, description="ID of the interview session"),
    answer: str = Body(..., embed=True, description="Candidate's answer to the current question")
):
    """
    Submit an answer to the current interview question and get feedback.
    
    Args:
        session_id: ID of the interview session
        answer: The candidate's answer to the current question
        
    Returns:
        Dictionary containing feedback and information about the next question
    """
    language = get_request_language(request)
    logger.info(f"Processing answer for session {session_id}")
    
    # Validate session exists
    if session_id not in interview_sessions:
        error_msg = translator.get("errors.session_not_found", language, session_id=session_id)
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_msg
        )
    
    session = interview_sessions[session_id]
    current_q = session["current_question_index"]
    
    # Validate answer
    if not answer or not answer.strip():
        error_msg = translator.get("errors.empty_answer", language)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Check if there are questions left
    if current_q >= len(session["questions"]):
        error_msg = translator.get("errors.no_more_questions", language)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    question_text = session["questions"][current_q]["text"]
    
    # Store the answer
    session["answers"].append({
        "question": question_text,
        "answer": answer,
        "timestamp": time.time()
    })
    
    # Generate feedback using AI
    try:
        feedback_response = await ai_client.evaluate_answer(
            question=question_text,
            answer=answer,
            question_type=session["questions"][current_q].get("type", "general")
        )
        
        # Map the response to the expected feedback format
        feedback = {
            "evaluation": feedback_response.get("evaluation", ""),
            "score": feedback_response.get("score", 0),
            "strengths": [],
            "improvements": []
        }
        
    except Exception as e:
        logger.error(f"Error generating feedback: {str(e)}", exc_info=True)
        feedback = {
            "evaluation": translator.get("errors.feedback_generation_failed", language),
            "score": 0,
            "strengths": [],
            "improvements": []
        }
    
    # Move to next question
    session["current_question_index"] += 1
    is_complete = session["current_question_index"] >= len(session["questions"])
    
    # If that was the last question, mark session as complete
    if is_complete:
        session["end_time"] = time.time()
        logger.info(f"Completed interview session {session_id}")
    
    # Prepare response
    response = {
        "success": True,
        "message": translator.get("success.answer_submitted", language),
        "feedback": feedback,
        "is_complete": is_complete,
        "question_number": min(session["current_question_index"] + 1, len(session["questions"]))
    }
    
    # Add next question if available
    if not is_complete:
        next_q = session["questions"][session["current_question_index"]]
        # Ensure consistent question format
        response["next_question"] = {
            "text": next_q["text"] if isinstance(next_q.get("text"), str) else 
                   (next_q["text"]["text"] if isinstance(next_q.get("text"), dict) else ""),
            "type": next_q.get("type", "general")
        }
        logger.debug(f"Formatted next question: {response['next_question']}")
    else:
        # Add summary for completed interview
        response["summary"] = {
            "total_questions": len(session["questions"]),
            "total_answers": len(session["answers"]),
            "duration_seconds": int(session["end_time"] - session["start_time"])
        }
    
    return response

@router.get("/session/{session_id}")
async def get_session(
    request: Request,
    session_id: str
):
    """
    Get the current state of an interview session.
    
    Args:
        session_id: ID of the interview session to retrieve
        
    Returns:
        Dictionary containing the session details, questions, and answers
    """
    language = get_request_language(request)
    logger.info(f"Retrieving session {session_id}")
    
    # Validate session exists
    if session_id not in interview_sessions:
        error_msg = translator.get("errors.session_not_found", language, session_id=session_id)
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_msg
        )
    
    session = interview_sessions[session_id]
    is_complete = session["current_question_index"] >= len(session["questions"])
    
    # Calculate session duration
    end_time = session.get("end_time") or time.time()
    duration_seconds = int(end_time - session["start_time"])
    
    # Calculate average score
    avg_score = calculate_average_score(session["answers"])
    
    # Format response
    response = {
        "success": True,
        "message": translator.get("success.session_retrieved", language),
        "session_id": session_id,
        "current_question": session["current_question_index"] + 1,  # 1-based index for display
        "total_questions": len(session["questions"]),
        "is_complete": is_complete,
        "questions": session["questions"],
        "answers": session["answers"],
        "start_time": session["start_time"],
        "end_time": session.get("end_time"),
        "duration_seconds": duration_seconds,
        "average_score": avg_score,
        "interview_type": session["interview_type"],
        "language": session.get("language", language)
    }
    
    # Add detected role and domain for non_technical interviews
    if session["interview_type"] == "non_technical":
        response.update({
            "detected_role": session.get("detected_role", "Professional Role"),
            "detected_domain": session.get("detected_domain", "General Business")
        })
    
    # Add current question if available
    current_question_idx = session["current_question_index"]
    if not is_complete and current_question_idx < len(session["questions"]):
        current_question = session["questions"][current_question_idx]
        response.update({
            "current_question": current_question["text"],
            "question_type": current_question["type"],
            "question_number": current_question_idx + 1
        })
    
    # Add completion summary if interview is complete
    if is_complete:
        response["summary"] = {
            "total_questions": len(session["questions"]),
            "total_answers": len(session["answers"]),
            "duration_seconds": duration_seconds,
            "average_score": response["average_score"]
        }
    
    return response