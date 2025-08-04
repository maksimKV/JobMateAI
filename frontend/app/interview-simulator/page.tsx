'use client';

import { useState, useCallback } from 'react';
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
  CheckCircle 
} from 'lucide-react';

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
  detected_domain: undefined
};

// Define the component props type
type InterviewSimulatorPageProps = Record<string, never>;

export default function InterviewSimulatorPage({}: InterviewSimulatorPageProps) {
  // State management
  const [jobDescription, setJobDescription] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('hr');
  const [interviewLength, setInterviewLength] = useState<InterviewLength>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [showCompletion, setShowCompletion] = useState(false);
  
  // Session state with proper typing
  const [session, setSession] = useState(() => ({
    ...initialSessionState,
    questions: [] as InterviewQuestion[],
    feedback: [] as InterviewFeedback[]
  }));

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
      
      // Update session with new question
      const questionType = res.question_type as 'hr' | 'technical' | 'non_technical';
      setSession({
        ...initialSessionState,
        sessionId: res.session_id,
        interviewType,
        questions: [{
          text: res.current_question,
          type: questionType
        }],
        feedback: [] as InterviewFeedback[],
        currentQuestionIndex: 0,
        isComplete: false,
        detected_role: res.detected_role,
        detected_domain: res.detected_domain
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
        
        // Save session to localStorage when complete
        if (isComplete) {
          localStorage.setItem('interviewSession', JSON.stringify({
            sessionId: prev.sessionId,
            questions: updatedQuestions,
            feedback: updatedFeedback,
            interviewType: prev.interviewType,
            timestamp: new Date().toISOString()
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
                    { value: 'short' as const, label: 'Short (4 questions)' },
                    { value: 'medium' as const, label: 'Medium (8 questions)' },
                    { value: 'long' as const, label: 'Long (12 questions)' },
                  ].map((length) => (
                    <div 
                      key={length.value}
                      className={`p-4 border rounded-lg cursor-pointer text-center ${
                        interviewLength === length.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setInterviewLength(length.value)}
                    >
                      {length.label}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {interviewType === 'mixed' 
                    ? `This will include ${4} HR questions and ${4} technical questions.`
                    : interviewType === 'non_technical'
                      ? `This interview will include ${8} non-technical questions.`
                      : `This interview will include ${8} ${interviewType} questions.`
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
                    Question {currentQuestionIndex + 1} of {questions.length}
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
                <p className="text-gray-800">{currentQuestion.text}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Answer
                  </label>
                  <textarea
                    id="answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Type your answer here..."
                  />
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
                      currentQuestionIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {session.feedback.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Feedback</h3>
                {session.feedback.map((feedback, index) => (
                  <div key={index} className="mb-6 last:mb-0">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">Question {index + 1}</h4>
                        <p className="text-sm text-gray-700 mt-1">{feedback.evaluation}</p>
                      </div>
                    </div>
                    {index < session.feedback.length - 1 && <hr className="my-4" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showCompletion && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-3 text-xl font-semibold text-gray-900">Interview Complete!</h2>
            <p className="mt-2 text-gray-600">
              You&apos;ve completed all the questions. Great job!
            </p>
            <div className="mt-6">
              <button
                onClick={handleRestart}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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