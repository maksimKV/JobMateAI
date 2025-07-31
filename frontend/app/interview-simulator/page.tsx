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
  InterviewSessionState,
  InterviewSession,
  InterviewFeedback,
  InterviewLength,
  INTERVIEW_LENGTHS,
  MIXED_INTERVIEW_LENGTHS
} from '@/types';
import { MessageSquare, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// Define the initial session state with proper typing
const initialSessionState: InterviewSessionState = {
  sessionId: null,
  questions: [],
  currentQuestionIndex: 0,
  feedback: [],
  interviewType: 'hr',
  isComplete: false
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
  const [session, setSession] = useState<InterviewSession>(() => ({
    ...initialSessionState,
    questions: [],
    feedback: [],
    interviewType: 'hr' as const
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
        questions: [],
        feedback: [],
        interviewType
      });
      
      const res: InterviewQuestionResponse = await interviewAPI.generateQuestions(req);
      
      // Update session with new question
      setSession({
        ...initialSessionState,
        sessionId: res.session_id,
        interviewType,
        questions: [{
          text: res.current_question,
          type: res.question_type as 'hr' | 'technical' // Ensure type safety
        }],
        feedback: [],
        currentQuestionIndex: 0,
        isComplete: false
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
        type: currentQuestion.type as 'hr' | 'technical' // Ensure type safety
      };
      
      // Make the API call first
      const res: AnswerSubmissionResponse = await interviewAPI.submitAnswer(req);
      
      // Then update the state in a single operation
      setSession(prev => {
        const updatedQuestions = [...prev.questions];
        const updatedFeedback = [...prev.feedback, {
          ...newFeedback,
          evaluation: res.feedback.evaluation,
          type: (res.question_type as 'hr' | 'technical') || 'hr'
        }];
        
        const isComplete = res.is_complete;
        const nextQuestionIndex = isComplete ? prev.currentQuestionIndex : prev.currentQuestionIndex + 1;
        
        // If there's a next question, add it to the questions array
        if (res.next_question && !isComplete) {
          updatedQuestions[nextQuestionIndex] = {
            text: res.next_question,
            type: (res.question_type as 'hr' | 'technical') || 'hr' // Ensure type safety
          };
        }
        
        const updatedSession: InterviewSession = {
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
    setSession((prev: InterviewSession) => ({
      ...initialSessionState,
      interviewType: prev.interviewType, // Use the current session's interviewType
      questions: [],
      feedback: []
    }));
    // Reset other states
    setJobDescription('');
    setAnswer('');
    setError(null);
    setShowCompletion(false);
  }, [setSession, setJobDescription, setAnswer, setError, setShowCompletion]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Navigation />
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <MessageSquare className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Simulator</h1>
            <p className="text-gray-600">
              Practice HR and technical interviews with AI-generated questions and feedback.
            </p>
          </div>

          {/* Setup */}
          {showInterviewTypeSelection && (
            <div className="space-y-6">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="jobDescription" className="block text-base font-semibold text-gray-900">
                    Job Description
                  </label>
                  {jobDescription && (
                    <button
                      type="button"
                      onClick={() => setJobDescription('')}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading}
                      title="Clear job description"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    id="jobDescription"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    rows={8}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Interview Type</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['hr', 'technical', 'mixed'] as InterviewType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`p-4 border rounded-lg transition-colors ${
                          interviewType === type
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                        onClick={() => setInterviewType(type)}
                      >
                        <div className="font-medium capitalize">
                          {type === 'hr' ? 'HR Interview' : type === 'technical' ? 'Technical Interview' : 'Mixed Interview'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Interview Length</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(interviewType === 'mixed' ? Object.entries(MIXED_INTERVIEW_LENGTHS) : Object.entries(INTERVIEW_LENGTHS)).map(([length, { label }]) => (
                      <button
                        key={length}
                        type="button"
                        className={`p-4 border rounded-lg transition-colors ${
                          interviewLength === length
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                        onClick={() => setInterviewLength(length as InterviewLength)}
                      >
                        <div className="font-medium">{label}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {interviewType === 'mixed' 
                      ? `This will include ${MIXED_INTERVIEW_LENGTHS[interviewLength].questions.hr} HR questions and ${MIXED_INTERVIEW_LENGTHS[interviewLength].questions.technical} technical questions.`
                      : `This interview will include ${INTERVIEW_LENGTHS[interviewLength].questions} ${interviewType} questions.`
                    }
                  </p>
                </div>
              </div>

              <div className="text-center">
                <button
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleStartInterview}
                  disabled={isLoading || !jobDescription.trim()}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Generating...
                    </span>
                  ) : (
                    'Start Interview'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Question/Answer Flow */}
          {showQuestion && currentQuestion && (
            <div className="space-y-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Question {session.currentQuestionIndex + 1}
                  </h2>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {currentQuestion.type === 'hr' ? 'HR' : 'Technical'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-800">
                  {currentQuestion.text}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Your Answer</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 min-h-[120px]"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  disabled={isLoading}
                />
              </div>
              
              <div className="text-center">
                <button
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSubmit}
                  disabled={isLoading || !answer.trim()}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Submitting...
                    </span>
                  ) : (
                    'Submit Answer'
                  )}
                </button>
              </div>
              
              {/* Show feedback for current question if available */}
              {session.feedback[session.currentQuestionIndex - 1] && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-blue-800 font-semibold">AI Feedback</span>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {session.feedback[session.currentQuestionIndex - 1].evaluation}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interview Completion Message */}
          {showCompletion && session.feedback && session.feedback.length > 0 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-green-700 mb-2">Interview Complete!</h2>
                <p className="text-gray-700 mb-6">Thank you for completing the interview. Here&apos;s the feedback for your last question.</p>
                
                {/* Last Question and Feedback */}
                <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto text-left">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Last Question:</h3>
                    <p className="text-gray-700">{session.questions[session.questions.length - 1]?.text}</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 bg-blue-100 text-blue-800">
                      {session.questions[session.questions.length - 1]?.type === 'hr' ? 'HR' : 'Technical'}
                    </span>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-1">Your Answer:</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">
                      {session.feedback[session.feedback.length - 1]?.answer || 'No answer provided'}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-blue-800 font-semibold">AI Feedback</span>
                    </div>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {session.feedback[session.feedback.length - 1]?.evaluation || 'No feedback available'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  View your complete interview summary and detailed statistics on the statistics page.
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                  <a
                    href="/statistics"
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    View Full Statistics
                  </a>
                  <button
                    onClick={handleRestart}
                    className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Start New Interview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}