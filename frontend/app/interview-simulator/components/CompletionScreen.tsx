import React from 'react';
import Link from 'next/link';
import { InterviewFeedback } from '../types';
import { FeedbackDisplay } from './FeedbackDisplay';

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
          <Link
            href={`/statistics?session=${sessionId}`}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Detailed Statistics
          </Link>
          <Link
            href="/interview-simulator"
            onClick={(e) => {
              e.preventDefault();
              onRestart();
            }}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Start New Interview
          </Link>
        </div>
      </div>
      
      {/* Last Question Feedback */}
      {lastFeedback && (
        <FeedbackDisplay 
          feedback={[lastFeedback]} 
          question={lastFeedback.question}
          answer={lastFeedback.answer}
          showFullContext={true}
        />
      )}
    </div>
  );
};
