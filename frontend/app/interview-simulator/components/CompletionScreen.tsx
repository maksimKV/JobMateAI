import React from 'react';

import { InterviewFeedback } from '../types';

interface CompletionScreenProps {
  onRestart: () => void;
  lastFeedback?: InterviewFeedback;
  sessionId?: string;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({ 
  onRestart, 
  lastFeedback,
  sessionId 
}) => {
  return (
    <div className="space-y-8">
      {/* Main completion card */}
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Interview Complete!</h2>
        <p className="mt-2 text-gray-600 max-w-md mx-auto">
          You&apos;ve successfully completed the interview. Check out your detailed performance analysis.
        </p>
        
        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
          <a
            href={`/statistics?session=${sessionId}`}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Detailed Statistics
          </a>
          <a
            href="/interview-simulator"
            onClick={(e) => {
              e.preventDefault();
              onRestart();
            }}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Start New Interview
          </a>
        </div>
      </div>
      
      {/* Last Question Feedback */}
      {lastFeedback && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Last Question Feedback</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">Question</h4>
                  <p className="mt-1 text-sm text-gray-700">{lastFeedback.question}</p>
                  <h4 className="text-sm font-medium text-gray-900 mt-2">Your Answer</h4>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{lastFeedback.answer}</p>
                  <h4 className="text-sm font-medium text-gray-900 mt-2">Feedback</h4>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{lastFeedback.evaluation}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
