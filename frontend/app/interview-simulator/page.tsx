'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { interviewAPI, APIError } from '@/lib/api';
import { InterviewQuestionRequest, InterviewQuestionResponse, AnswerSubmissionRequest, AnswerSubmissionResponse } from '@/types';
import { MessageSquare, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

function parseQuestions(raw: string): string[] {
  // Try to split questions by newlines or numbers
  return raw
    .split(/\n|\r|\d+\.|\d+\)/)
    .map(q => q.trim())
    .filter(q => q.length > 10); // Only keep non-empty, reasonable questions
}

export default function InterviewSimulatorPage() {
  const [stage, setStage] = useState<'hr' | 'technical'>('hr');
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<AnswerSubmissionResponse['feedback'][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setQuestions([]);
    setSessionId(null);
    setCurrentIdx(0);
    setFeedback([]);
    setCompleted(false);
    try {
      const req: InterviewQuestionRequest = {
        job_description: jobDescription,
        stage,
      };
      const res: InterviewQuestionResponse = await interviewAPI.generateQuestions(req);
      setSessionId(res.session_id);
      setQuestions(parseQuestions(res.questions));
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!sessionId || !questions[currentIdx]) return;
    setIsLoading(true);
    setError(null);
    try {
      const req: AnswerSubmissionRequest = {
        session_id: sessionId,
        question: questions[currentIdx],
        answer,
        question_type: stage,
      };
      const res: AnswerSubmissionResponse = await interviewAPI.submitAnswer(req);
      setFeedback(prev => [...prev, res.feedback]);
      setAnswer('');
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(currentIdx + 1);
      } else {
        setCompleted(true);
      }
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setQuestions([]);
    setSessionId(null);
    setCurrentIdx(0);
    setAnswer('');
    setFeedback([]);
    setError(null);
    setCompleted(false);
    setJobDescription('');
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
          {questions.length === 0 && !isLoading && !completed && (
            <>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Interview Stage</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={stage}
                  onChange={e => setStage(e.target.value as 'hr' | 'technical')}
                >
                  <option value="hr">HR Interview</option>
                  <option value="technical">Technical Interview</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Paste Job Description</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 min-h-[120px]"
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                />
              </div>
              <div className="mb-6 text-center">
                <button
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGenerate}
                  disabled={isLoading || !jobDescription}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5 mr-2" />Generating...</span>
                  ) : (
                    'Generate Questions'
                  )}
                </button>
              </div>
            </>
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
          {questions.length > 0 && !completed && (
            <div className="space-y-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Question {currentIdx + 1} of {questions.length}</h2>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-800">
                  {questions[currentIdx]}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Your Answer</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 min-h-[80px]"
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
                  disabled={isLoading || !answer}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5 mr-2" />Submitting...</span>
                  ) : (
                    (currentIdx + 1 === questions.length ? 'Finish Interview' : 'Submit Answer')
                  )}
                </button>
              </div>
              {/* Show feedback for current question if available */}
              {feedback[currentIdx] && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-blue-800 font-semibold">AI Feedback</span>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {feedback[currentIdx].evaluation}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Completed Session Summary */}
          {completed && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-green-700 mb-2">Interview Complete!</h2>
                <p className="text-gray-700">Here is your session summary and feedback for each question.</p>
              </div>
              {questions.map((q, idx) => (
                <div key={idx} className="mb-6">
                  <div className="font-semibold text-gray-900 mb-1">Q{idx + 1}: {q}</div>
                  <div className="mb-1 text-gray-700"><span className="font-semibold">Your Answer:</span> {feedback[idx]?.answer}</div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-blue-800 font-semibold">AI Feedback</span>
                    </div>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {feedback[idx]?.evaluation}
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-center">
                <button
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200"
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