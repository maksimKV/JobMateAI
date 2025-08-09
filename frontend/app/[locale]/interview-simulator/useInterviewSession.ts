'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { interviewAPI } from '@/lib/api';
import { 
  InterviewType, 
  InterviewLength, 
  InterviewQuestionRequest, 
  InterviewQuestionResponse, 
  AnswerSubmissionRequest, 
  AnswerSubmissionResponse 
} from '@/types';
import { 
  InterviewSessionState, 
  initialSessionState, 
  InterviewQuestion, 
  InterviewFeedback, 
  QuestionType 
} from './types';

export const useInterviewSession = () => {
  const t = useTranslations('interviewSimulator.session');
  const [session, setSession] = useState<InterviewSessionState>(initialSessionState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startInterview = useCallback(async (jobDescription: string, interviewType: InterviewType, interviewLength: string) => {
    if (!jobDescription.trim()) {
      setError(t('errors.jobDescriptionRequired'));
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
      setError(err instanceof Error ? err.message : t('errors.unexpected'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
        evaluation: t('evaluatingAnswer'),
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
          // Handle both string and object formats for next_question
          const nextQuestion = res.next_question;
          
          // Helper function to ensure we always get a valid QuestionType
          const getQuestionType = (type?: string): QuestionType => {
            const validTypes: QuestionType[] = ['hr', 'technical', 'non_technical'];
            return type && validTypes.includes(type as QuestionType) 
              ? type as QuestionType 
              : 'hr';
          };
          
          if (typeof nextQuestion === 'string') {
            updatedQuestions[nextQuestionIndex] = {
              text: nextQuestion,
              type: getQuestionType(res.question_type)
            };
          } else {
            // TypeScript now knows nextQuestion is { text: string; type?: string }
            updatedQuestions[nextQuestionIndex] = {
              text: nextQuestion.text,
              type: getQuestionType(nextQuestion.type || res.question_type)
            };
          }
          
          console.log('Next question processed:', updatedQuestions[nextQuestionIndex]);
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
      setError(err instanceof Error ? err.message : t('errors.unexpected'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session.sessionId, t]);

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
