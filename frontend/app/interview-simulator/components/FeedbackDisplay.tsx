import React from 'react';
import { InterviewFeedback } from '../types';

interface FeedbackDisplayProps {
  feedback: InterviewFeedback[];
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ feedback }) => {
  if (feedback.length === 0) return null;

  const latestFeedback = feedback[feedback.length - 1];

  return (
    <div className="p-6 bg-blue-50 rounded-lg border border-blue-100 w-full">
      <div className="flex flex-col items-center text-center mb-4">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <h4 className="text-lg font-medium text-gray-900">Your Answer Feedback</h4>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-gray-700 whitespace-pre-line">
          {latestFeedback.evaluation}
        </p>
      </div>
    </div>
  );
};
