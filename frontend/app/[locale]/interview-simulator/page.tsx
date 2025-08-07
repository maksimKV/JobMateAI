'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Navigation from '@/components/Navigation';
import { InterviewType } from '@/types';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useInterviewSession } from './useInterviewSession';
import { InterviewTypeSelector } from './components/InterviewTypeSelector';
import { QuestionDisplay } from './components/QuestionDisplay';
import { FeedbackDisplay } from './components/FeedbackDisplay';
import { CompletionScreen } from './components/CompletionScreen';

// Constants for interview configuration
const INTERVIEW_LENGTHS = {
  short: { label: 'short', questions: 4 },
  medium: { label: 'medium', questions: 8 },
  long: { label: 'long', questions: 12 },
} as const;

const MIXED_INTERVIEW_LENGTHS = {
  short: { label: 'short', questions: { hr: 4, technical: 4 } },
  medium: { label: 'medium', questions: { hr: 8, technical: 8 } },
  long: { label: 'long', questions: { hr: 12, technical: 12 } },
} as const;

const InterviewSimulatorPage = () => {
  const t = useTranslations('interviewSimulator.page');
  
  // Refs
  const answerTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // State management
  const [jobDescription, setJobDescription] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('hr');
  const [interviewLength, setInterviewLength] = useState<string>('medium');
  const [answer, setAnswer] = useState('');
  const [showCompletion, setShowCompletion] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  
  // Speech recognition hook
  const {
    transcript,
    listening,
    recognitionError,
    startListening,
    stopListening,
    isBrowserSupported,
    clearTranscript
  } = useSpeechToText();
  
  // Interview session hook
  const {
    session,
    isLoading,
    error: sessionError,
    startInterview: startInterviewSession,
    submitAnswer: submitAnswerToSession,
    restartInterview,
  } = useInterviewSession();
  
  // Destructure session for easier access
  const { 
    questions, 
    currentQuestionIndex, 
    isComplete, 
    sessionId,
    feedback
  } = session;
  
  const currentQuestion = questions[currentQuestionIndex];
  
  // UI state flags
  const showInterviewTypeSelection = !sessionId && questions.length === 0;
  const showQuestion = questions.length > 0 && !isComplete;
  
  // Update answer when transcript changes
  useEffect(() => {
    if (transcript) {
      setAnswer(transcript);
      // Auto-scroll textarea to bottom when new transcript comes in
      if (answerTextareaRef.current) {
        answerTextareaRef.current.scrollTop = answerTextareaRef.current.scrollHeight;
      }
    }
  }, [transcript]);
  
  // Toggle recording
  const toggleRecording = useCallback(async () => {
    // Don't allow toggling if we're currently loading
    if (isLoading) return;
    
    try {
      if (listening) {
        stopListening();
      } else {
        await startListening();
      }
    } catch (err) {
      console.error('Error toggling recording:', err);
      setUiError(t('errors.toggleRecording'));
    }
  }, [listening, startListening, stopListening, isLoading, t]);
  
  // Stop recording when component unmounts or interview completes
  useEffect(() => {
    return () => {
      if (listening) {
        stopListening();
      }
    };
  }, [listening, stopListening]);
  
  // Reset interview length when interview type changes
  useEffect(() => {
    setInterviewLength('medium');
  }, [interviewType]);
  
  // Handle starting a new interview
  const handleStartInterview = useCallback(async () => {
    if (!jobDescription.trim()) {
      setUiError(t('errors.jobDescriptionRequired'));
      return;
    }
    
    try {
      // Convert interviewLength to string if needed
      const length = interviewLength as string;
      await startInterviewSession(jobDescription, interviewType, length);
      setAnswer('');
      setShowCompletion(false);
      setUiError(null);
    } catch (err) {
      console.error('Failed to start interview:', err);
      setUiError(t('errors.startInterview'));
    }
  }, [jobDescription, interviewType, interviewLength, startInterviewSession, t]);
  
  // Handle submitting an answer
  const handleSubmitAnswer = useCallback(async () => {
    if (!currentQuestion || !answer.trim() || !sessionId || isSubmittingAnswer) return;
    
    // Stop speech recognition if it's active
    if (listening) {
      stopListening();
    }
    
    const currentAnswer = answer;
    setIsSubmittingAnswer(true);
    
    try {
      const isComplete = await submitAnswerToSession(currentAnswer, currentQuestion);
      
      if (isComplete) {
        setShowCompletion(true);
      } else {
        // Only clear the answer if we're not showing completion
        setAnswer('');
      }
      clearTranscript();
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setUiError(t('errors.submitAnswer'));
    } finally {
      setIsSubmittingAnswer(false);
    }
  }, [answer, currentQuestion, sessionId, submitAnswerToSession, listening, stopListening, clearTranscript, isSubmittingAnswer, t]);
  
  // Handle restarting the interview
  const handleRestart = useCallback(() => {
    restartInterview();
    setAnswer('');
    setJobDescription('');
    setShowCompletion(false);
    setUiError(null);
  }, [restartInterview]);

  // Combine session error and UI error
  const error = sessionError || uiError;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-blue-600 mr-3">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          </div>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        {showInterviewTypeSelection && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <InterviewTypeSelector
              interviewType={interviewType}
              onInterviewTypeChange={setInterviewType}
              interviewLength={interviewLength}
              onInterviewLengthChange={setInterviewLength}
              jobDescription={jobDescription}
              onJobDescriptionChange={setJobDescription}
              onStartInterview={handleStartInterview}
              isLoading={isLoading}
              interviewLengths={interviewType === 'mixed' ? MIXED_INTERVIEW_LENGTHS : INTERVIEW_LENGTHS}
            />
          </div>
        )}
        
        {showQuestion && currentQuestion && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <QuestionDisplay
                question={currentQuestion}
                answer={answer}
                onAnswerChange={setAnswer}
                onSubmit={handleSubmitAnswer}
                isLoading={isLoading}
                isSubmittingAnswer={isSubmittingAnswer}
                isLastQuestion={currentQuestionIndex >= questions.length - 1}
                detectedRole={session.detected_role}
                isBrowserSupported={isBrowserSupported}
                listening={listening}
                recognitionError={recognitionError}
                onToggleRecording={toggleRecording}
                transcript={transcript}
                questionNumber={currentQuestionIndex + 1}
              />
            </div>
            
            {feedback.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <FeedbackDisplay feedback={feedback} />
              </div>
            )}
          </div>
        )}
        
        {showCompletion && (
          <CompletionScreen 
            onRestart={handleRestart}
            lastFeedback={feedback[feedback.length - 1]}
            sessionId={session.sessionId || undefined}
          />
        )}
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default InterviewSimulatorPage;
