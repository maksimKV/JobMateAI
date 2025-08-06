'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Navigation from '@/components/Navigation';
import { interviewAPI, APIError } from '@/lib/api';
import { 
  InterviewQuestionRequest, 
  InterviewQuestionResponse, 
  AnswerSubmissionRequest, 
  AnswerSubmissionResponse,
  InterviewType,
  InterviewLength
} from '@/types';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Mic,
  MicOff
} from 'lucide-react';
import { useSpeechToText } from '@/hooks/useSpeechToText';

// Define the question type
type InterviewQuestion = {
  text: string;
  type: 'hr' | 'technical' | 'non_technical';
};

// Define the feedback type
type InterviewFeedback = {
  question: string;
  answer: string;
  evaluation: string;
  type: 'hr' | 'technical' | 'non_technical';
  score?: number;
  question_type?: 'hr' | 'technical_theory' | 'technical_practical';
};

// Define the session state type
interface InterviewSessionState {
  sessionId: string | null;
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  feedback: InterviewFeedback[];
  interviewType: InterviewType;
  isComplete: boolean;
  detected_role?: string;
  detected_domain?: string;
  company_name?: string;
  position?: string;
  job_description?: string;
}

// Define the initial session state with proper typing
const initialSessionState: InterviewSessionState = {
  sessionId: null,
  questions: [],
  currentQuestionIndex: 0,
  feedback: [],
  interviewType: 'hr',
  isComplete: false,
  detected_role: undefined,
  detected_domain: undefined,
  company_name: undefined,
  job_description: ''
};

// Define the component props type
type InterviewSimulatorPageProps = Record<string, never>;

const INTERVIEW_LENGTHS = {
  short: { questions: 4 },
  medium: { questions: 8 },
  long: { questions: 12 }
} as const;

const MIXED_INTERVIEW_LENGTHS = {
  short: { questions: { hr: 4, technical: 4 } },
  medium: { questions: { hr: 8, technical: 8 } },
  long: { questions: { hr: 12, technical: 12 } }
} as const;

const NON_TECHNICAL_LENGTHS = {
  short: { questions: 4 },
  medium: { questions: 8 },
  long: { questions: 12 }
} as const;

export default function InterviewSimulatorPage({}: InterviewSimulatorPageProps) {
  // State management
  const [jobDescription, setJobDescription] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('hr');
  const [interviewLength, setInterviewLength] = useState<InterviewLength>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [showCompletion, setShowCompletion] = useState(false);
  const answerTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Use our enhanced speech recognition hook
  const {
    transcript,
    listening,
    recognitionError,
    startListening,
    stopListening,
    isBrowserSupported
  } = useSpeechToText();
  
  // Update answer when transcript changes
  useEffect(() => {
    if (transcript) {
      setAnswer(transcript);
    }
  }, [transcript]);
  
  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (listening) {
      stopListening();
    } else {
      await startListening();
    }
  }, [listening, startListening, stopListening]);
  
  // Stop recording when component unmounts or interview completes
  useEffect(() => {
    return () => {
      if (listening) {
        stopListening();
      }
    };
  }, [listening, stopListening]);
  
  // Session state with proper typing
  const [session, setSession] = useState(() => ({
    ...initialSessionState,
    questions: [] as InterviewQuestion[],
    feedback: [] as InterviewFeedback[]
  }));

  useEffect(() => {
    setInterviewLength('medium');
  }, [interviewType]);

  // Destructure session for easier access
  const { questions, currentQuestionIndex, isComplete, sessionId } = session;
  const currentQuestion = questions[currentQuestionIndex];
  
  // UI state flags
  const showInterviewTypeSelection = !sessionId && questions.length === 0;
  const showQuestion = questions.length > 0 && !isComplete;

  const handleStartInterview = useCallback(async (): Promise<void> => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowCompletion(false);
    
    try {
      const req: InterviewQuestionRequest = {
        job_description: jobDescription,
        interview_type: interviewType,
        length: interviewLength,
      };
      
      // Reset session with proper typing
      setSession({
        ...initialSessionState,
        questions: [] as InterviewQuestion[],
        feedback: [] as InterviewFeedback[],
        interviewType,
      });
      
      const res: InterviewQuestionResponse = await interviewAPI.generateQuestions(req);
      
      // Update session with new question and job info from backend
      const questionType = res.question_type as 'hr' | 'technical' | 'non_technical';
      
      setSession({
        ...initialSessionState,
        sessionId: res.session_id,
        interviewType: interviewType as InterviewType,
        questions: [{
          text: res.current_question,
          type: questionType
        }],
        currentQuestionIndex: 0,
        isComplete: false,
        detected_role: res.detected_role,
        detected_domain: res.detected_domain,
        company_name: res.company_name,
        position: res.position,
        job_description: jobDescription
      });
      
      setError(null);
    } catch (err) {
      console.error('Error generating questions:', err);
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [jobDescription, interviewType, interviewLength]);

  const handleSubmit = async (): Promise<void> => {
    if (!answer.trim() || !currentQuestion) return;
    
    setIsLoading(true);
    
    try {
      if (!session.sessionId) {
        throw new Error('No active interview session');
      }
      
      const req: AnswerSubmissionRequest = {
        session_id: session.sessionId,
        answer: answer,
      };
      
      // Create a new feedback object with proper typing
      const newFeedback: InterviewFeedback = {
        question: currentQuestion.text,
        answer,
        evaluation: 'Evaluating your answer...',
        type: currentQuestion.type,
        score: undefined,
        question_type: undefined
      };
      
      // Make the API call first
      const res: AnswerSubmissionResponse = await interviewAPI.submitAnswer(req);
      
      // Then update the state in a single operation
      setSession(prev => {
        const updatedQuestions = [...prev.questions];
        const updatedFeedback = [...prev.feedback, {
          ...newFeedback,
          evaluation: res.feedback.evaluation,
          type: (res.question_type as 'hr' | 'technical' | 'non_technical') || 'hr'
        }];
        
        const isComplete = res.is_complete;
        const nextQuestionIndex = isComplete ? prev.currentQuestionIndex : prev.currentQuestionIndex + 1;
        
        // If there's a next question, add it to the questions array
        if (res.next_question && !isComplete) {
          updatedQuestions[nextQuestionIndex] = {
            text: res.next_question,
            type: (res.question_type as 'hr' | 'technical' | 'non_technical') || 'hr' // Ensure type safety
          };
        }
        
        const updatedSession = {
          ...prev,
          questions: updatedQuestions,
          currentQuestionIndex: nextQuestionIndex,
          feedback: updatedFeedback,
          isComplete
        };
        
        // Save session data to localStorage when complete
        if (isComplete) {
          localStorage.setItem('interviewSession', JSON.stringify({
            sessionId: prev.sessionId,
            company_name: prev.company_name,
            position: prev.position,
            timestamp: new Date().toISOString(),
            // Include questions and feedback for statistics page
            questions: updatedQuestions,
            feedback: updatedFeedback,
            interviewType: prev.interviewType
          }));
        }
        
        return updatedSession;
      });
      
      setAnswer('');
      setShowCompletion(res.is_complete);
      
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError(err instanceof APIError ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle restarting the interview
  const handleRestart = useCallback((): void => {
    setSession((prev) => ({
      ...initialSessionState,
      interviewType: prev.interviewType, // Use the current session's interviewType
      questions: [] as InterviewQuestion[],
      feedback: [] as InterviewFeedback[]
    }));
    // Reset other states
    setJobDescription('');
    setAnswer('');
    setError(null);
    setShowCompletion(false);
  }, [setSession, setJobDescription, setAnswer, setError, setShowCompletion]);

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
            <h1 className="text-3xl font-bold text-gray-900">Interview Simulator</h1>
          </div>
          <p className="text-gray-600">Practice your interview skills with AI-powered simulations</p>
        </div>

        {showInterviewTypeSelection && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="jobDescription" className="block text-gray-700 font-semibold mb-2">
                  Job Description
                </label>
                <textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Paste the job description here..."
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Interview Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { value: 'hr' as const, label: 'HR Interview', description: 'Behavioral and situational questions' },
                    { value: 'technical' as const, label: 'Technical Interview', description: 'Coding and technical questions' },
                    { value: 'mixed' as const, label: 'Mixed Interview', description: 'Combination of HR and technical' },
                    { value: 'non_technical' as const, label: 'Non-Technical', description: 'For non-technical roles' },
                  ].map((type) => (
                    <div 
                      key={type.value}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        interviewType === type.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setInterviewType(type.value)}
                    >
                      <h3 className="font-medium text-gray-900">{type.label}</h3>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Interview Length
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 'short' as const, label: 'Short', questions: interviewType === 'mixed' ? 8 : 4 },
                    { value: 'medium' as const, label: 'Medium', questions: interviewType === 'mixed' ? 16 : 8 },
                    { value: 'long' as const, label: 'Long', questions: interviewType === 'mixed' ? 24 : 12 },
                  ].map((length) => {
                    const questionCount = interviewType === 'mixed' 
                      ? length.questions
                      : interviewType === 'non_technical'
                        ? length.questions
                        : length.questions;
                        
                    return (
                      <div 
                        key={length.value}
                        className={`p-4 border rounded-lg cursor-pointer text-center ${
                          interviewLength === length.value 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setInterviewLength(length.value)}
                      >
                        <div className="font-medium text-gray-900">{length.label}</div>
                        <div className="text-sm text-gray-600">
                          {questionCount} {questionCount === 1 ? 'question' : 'questions'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {interviewType === 'mixed' 
                    ? `This will include ${MIXED_INTERVIEW_LENGTHS[interviewLength].questions.hr} HR questions and ${MIXED_INTERVIEW_LENGTHS[interviewLength].questions.technical} technical questions.`
                    : interviewType === 'non_technical'
                      ? `This interview will include ${NON_TECHNICAL_LENGTHS[interviewLength].questions} non-technical questions.`
                      : `This interview will include ${INTERVIEW_LENGTHS[interviewLength].questions} ${interviewType} questions.`
                  }
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleStartInterview}
                  disabled={isLoading || !jobDescription.trim()}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Preparing Interview...
                    </>
                  ) : (
                    'Start Interview'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showQuestion && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Question {currentQuestionIndex + 1}
                  </h2>
                  {session.detected_role && (
                    <p className="text-sm text-gray-500">
                      Detected Role: <span className="font-medium">{session.detected_role}</span>
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {currentQuestion.type.charAt(0).toUpperCase() + currentQuestion.type.slice(1)}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-gray-800">
                  {currentQuestion.text.replace(/^\d+\.?\s*/, '')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="answer" className="block text-sm font-medium text-gray-700">
                      Your Answer
                    </label>
                    <div className="flex items-center">
                      {!isBrowserSupported && (
                        <span className="text-xs text-yellow-600 mr-2">
                          Speech recognition not supported in your browser
                        </span>
                      )}
                      {recognitionError && (
                        <span className="text-xs text-red-600 mr-2">
                          {recognitionError}
                        </span>
                      )}
                      {isBrowserSupported && (
                        <button
                          type="button"
                          onClick={toggleRecording}
                          className={`p-2 rounded-full ${listening ? 'text-red-500 animate-pulse' : 'text-gray-500 hover:text-gray-700'}`}
                          title={listening ? 'Stop recording' : 'Start recording'}
                        >
                          {listening ? (
                            <div className="flex items-center">
                              <MicOff className="h-5 w-5 mr-1" />
                              <span className="text-xs">Stop</span>
                            </div>
                          ) : (
                            <Mic className="h-5 w-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      id="answer"
                      ref={answerTextareaRef}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 pr-10"
                      rows={4}
                      placeholder={isBrowserSupported ? 'Type or speak your answer...' : 'Type your answer...'}
                    />
                    {listening && (
                      <div className="absolute right-3 bottom-3 flex items-center">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      </div>
                    )}
                  </div>
                  {isBrowserSupported && listening && (
                    <p className="mt-2 text-sm text-gray-500">
                      Speak now... {transcript && !transcript.endsWith(' ') && '✓'}
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || !answer.trim()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Processing...
                      </span>
                    ) : (
                      currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next Question'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {session.feedback.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Feedback</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">Your Answer Feedback</h4>
                        <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                          {session.feedback[session.feedback.length - 1].evaluation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {showCompletion && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Interview Complete!</h2>
            <p className="mt-2 text-gray-600 max-w-md mx-auto">
              You&apos;ve successfully completed the interview. Check out your detailed performance analysis.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="/statistics"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View Statistics
              </a>
              <button
                onClick={handleRestart}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Start New Interview
              </button>
            </div>
          </div>
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
}