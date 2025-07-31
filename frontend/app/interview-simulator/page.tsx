'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { interviewAPI, APIError } from '@/lib/api';
import { 
  InterviewQuestionRequest, 
  InterviewQuestionResponse, 
  AnswerSubmissionRequest, 
  AnswerSubmissionResponse,
  InterviewType,
  InterviewSessionState
} from '@/types';
import { MessageSquare, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const initialSessionState: InterviewSessionState = {
  sessionId: null,
  questions: [],
  currentQuestionIndex: 0,
  feedback: [],
  interviewType: 'hr',
  isComplete: false
};

export default function InterviewSimulatorPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [session, setSession] = useState<InterviewSessionState>({
    ...initialSessionState,
    interviewType: 'hr' // Set default interview type
  });
  
  const currentQuestion = session.questions[session.currentQuestionIndex];
  const showInterviewTypeSelection = !session.sessionId && session.questions.length === 0;
  const showQuestion = session.questions.length > 0 && !session.isComplete;
  const showCompletion = session.isComplete;

  const handleGenerate = async (interviewType: InterviewType) => {
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
      };
      
      setSession({
        ...initialSessionState,
        interviewType
      });
      
      const res: InterviewQuestionResponse = await interviewAPI.generateQuestions(req);
      
      setSession({
        ...initialSessionState,
        sessionId: res.session_id,
        interviewType,
        questions: [{
          text: res.current_question,
          type: res.question_type as 'hr' | 'technical'
        }],
        currentQuestionIndex: 0
      });
      
    } catch (err) {
      console.error('Error generating questions:', err);
      setError(err instanceof APIError ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
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
      
      // Update local state optimistically
      const updatedFeedback = [
        ...session.feedback,
        {
          question: currentQuestion.text,
          answer,
          evaluation: 'Evaluating your answer...',
          type: currentQuestion.type
        }
      ];
      
      setSession({
        ...session,
        feedback: updatedFeedback,
        currentQuestionIndex: session.currentQuestionIndex + 1
      });
      
      const res: AnswerSubmissionResponse = await interviewAPI.submitAnswer(req);
      
      // Update session with feedback and next question if available
      setSession(prev => {
        const updatedQuestions = [...prev.questions];
        const updatedFeedback = [...prev.feedback];
        
        // Add next question if available
        if (res.next_question && !res.is_complete) {
          updatedQuestions[prev.currentQuestionIndex + 1] = {
            text: res.next_question,
            type: res.question_type as 'hr' | 'technical'
          };
        }
        
        updatedFeedback[prev.currentQuestionIndex - 1] = {
          question: prev.questions[prev.currentQuestionIndex - 1].text,
          answer: answer,
          evaluation: res.feedback.evaluation,
          type: prev.questions[prev.currentQuestionIndex - 1].type
        };
        
        return {
          ...prev,
          questions: updatedQuestions,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          feedback: updatedFeedback,
          isComplete: res.is_complete
        };
      });
      
      setAnswer('');
      
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError(err instanceof APIError ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setSession({
      ...initialSessionState,
      interviewType: session.interviewType // Keep the same interview type
    });
    setJobDescription('');
    setAnswer('');
    setError(null);
  };

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
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Select Interview Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['hr', 'technical', 'mixed'] as InterviewType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`p-4 border rounded-lg transition-colors ${
                        session.interviewType === type
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                      onClick={() => setSession(prev => ({ ...prev, interviewType: type }))}
                    >
                      <div className="font-medium capitalize">
                        {type === 'hr' ? 'HR Interview' : type === 'technical' ? 'Technical Interview' : 'Mixed Interview'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <button
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleGenerate(session.interviewType)}
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

          {/* Completed Session Summary */}
          {showCompletion && session.feedback && session.feedback.length > 0 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-green-700 mb-2">Interview Complete!</h2>
                <p className="text-gray-700">Here is your session summary and feedback for each question.</p>
              </div>
              
              {session.questions.map((question, idx) => {
                // Skip if question is undefined or doesn't have text
                if (!question || !question.text) {
                  console.warn(`Skipping invalid question at index ${idx}:`, question);
                  return null;
                }
                
                const feedback = session.feedback[idx];
                // Skip if no feedback for this question
                if (!feedback) {
                  console.warn(`No feedback found for question ${idx + 1}`);
                  return null;
                }
                
                return (
                  <div key={idx} className="mb-6">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-gray-900">
                        Q{idx + 1}: {question.text}
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {question.type === 'hr' ? 'HR' : 'Technical'}
                      </span>
                    </div>
                    <div className="mb-1 text-gray-700">
                      <span className="font-semibold">Your Answer:</span> {feedback.answer || 'No answer provided'}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="text-blue-800 font-semibold">AI Feedback</span>
                      </div>
                      <div className="text-gray-700 whitespace-pre-wrap">
                        {feedback.evaluation || 'No feedback available'}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="text-center">
                <button
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700"
                  onClick={handleRestart}
                >
                  Start New Interview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}