import { useState, useCallback } from 'react';
import { interviewAPI } from '@/lib/api';
import { InterviewType, InterviewLength, InterviewQuestionRequest, InterviewQuestionResponse, AnswerSubmissionRequest, AnswerSubmissionResponse } from '@/types';
import { InterviewSessionState, initialSessionState, InterviewQuestion, InterviewFeedback, QuestionType } from './types';

export const useInterviewSession = () => {
  const [session, setSession] = useState<InterviewSessionState>(initialSessionState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startInterview = useCallback(async (jobDescription: string, interviewType: InterviewType, interviewLength: string) => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const req: InterviewQuestionRequest = {
        job_description: jobDescription,
        interview_type: interviewType,
        length: interviewLength as InterviewLength,
      };
      
      setSession(() => ({
        ...initialSessionState,
        interviewType,
      }));
      
      const res: InterviewQuestionResponse = await interviewAPI.generateQuestions(req);
      
      setSession(prev => ({
        ...prev,
        sessionId: res.session_id,
        questions: [{
          text: res.current_question,
          type: res.question_type as QuestionType
        }],
        detected_role: res.detected_role,
        detected_domain: res.detected_domain,
        company_name: res.company_name,
        position: res.position,
        job_description: jobDescription
      }));
      
    } catch (err: unknown) {
      console.error('Error generating questions:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitAnswer = useCallback(async (answer: string, currentQuestion: InterviewQuestion) => {
    if (!answer.trim() || !session.sessionId) return;
    
    setIsLoading(true);
    
    try {
      const req: AnswerSubmissionRequest = {
        session_id: session.sessionId,
        answer: answer,
      };
      
      const newFeedback: InterviewFeedback = {
        question: currentQuestion.text,
        answer,
        evaluation: 'Evaluating your answer...',
        type: currentQuestion.type,
      };
      
      const res: AnswerSubmissionResponse = await interviewAPI.submitAnswer(req);
      
      setSession(prev => {
        const updatedQuestions = [...prev.questions];
        const updatedFeedback = [...prev.feedback, {
          ...newFeedback,
          evaluation: res.feedback.evaluation,
          type: (res.question_type as QuestionType) || 'hr'
        }];
        
        const isComplete = res.is_complete;
        const nextQuestionIndex = isComplete ? prev.currentQuestionIndex : prev.currentQuestionIndex + 1;
        
        if (res.next_question && !isComplete) {
          updatedQuestions[nextQuestionIndex] = {
            text: res.next_question,
            type: (res.question_type as QuestionType) || 'hr'
          };
        }
        
        const updatedSession = {
          ...prev,
          questions: updatedQuestions,
          currentQuestionIndex: nextQuestionIndex,
          feedback: updatedFeedback,
          isComplete
        };
        
        if (isComplete) {
          localStorage.setItem('interviewSession', JSON.stringify({
            sessionId: prev.sessionId,
            company_name: prev.company_name,
            position: prev.position,
            timestamp: new Date().toISOString(),
            questions: updatedQuestions,
            feedback: updatedFeedback,
            interviewType: prev.interviewType
          }));
        }
        
        return updatedSession;
      });
      
      return res.is_complete;
      
    } catch (err: unknown) {
      console.error('Error submitting answer:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session.sessionId]);

  const restartInterview = useCallback(() => {
    setSession(prev => ({
      ...initialSessionState,
      interviewType: prev.interviewType,
    }));
    setError(null);
  }, []);

  return {
    session,
    isLoading,
    error,
    startInterview,
    submitAnswer,
    restartInterview,
    setSession
  };
};
