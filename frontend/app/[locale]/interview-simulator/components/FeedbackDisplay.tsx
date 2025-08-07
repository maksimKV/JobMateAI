'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { InterviewFeedback } from '../types';

interface FeedbackDisplayProps {
  feedback: InterviewFeedback[];
  question?: string;
  answer?: string;
  showFullContext?: boolean;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ 
  feedback, 
  question, 
  answer, 
  showFullContext = false 
}) => {
  const t = useTranslations('interviewSimulator.feedbackDisplay');
  
  if (feedback.length === 0) return null;

  const latestFeedback = feedback[feedback.length - 1];
  const displayQuestion = question || latestFeedback.question || '';
  const displayAnswer = answer || latestFeedback.answer || '';
  const displayEvaluation = latestFeedback.evaluation || '';

  return (
    <div className="p-6 bg-blue-50 rounded-lg border border-blue-100 w-full">
      {showFullContext ? (
        // Full context view (for CompletionScreen)
        <div className="space-y-4">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900">{t('fullContext.title')}</h4>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h5 className="text-sm font-medium text-gray-900 mb-1">{t('fullContext.question')}</h5>
              <p className="text-gray-700">{displayQuestion}</p>
              
              <h5 className="text-sm font-medium text-gray-900 mt-3 mb-1">{t('fullContext.yourAnswer')}</h5>
              <p className="text-gray-700 whitespace-pre-line">{displayAnswer}</p>
              
              <h5 className="text-sm font-medium text-gray-900 mt-3 mb-1">{t('fullContext.feedback')}</h5>
              <p className="text-gray-700 whitespace-pre-line">{displayEvaluation}</p>
            </div>
          </div>
        </div>
      ) : (
        // Compact view (for in-interview feedback)
        <>
          <div className="flex flex-col items-center text-center mb-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900">{t('compact.title')}</h4>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-700 whitespace-pre-line">
              {displayEvaluation}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
