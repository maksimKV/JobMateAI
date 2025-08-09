'use client';

import React, { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { InterviewQuestion } from '../types';

interface QuestionDisplayProps {
  question: InterviewQuestion;
  answer: string;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isSubmittingAnswer: boolean;
  isLastQuestion: boolean;
  detectedRole?: string;
  isBrowserSupported: boolean;
  listening: boolean;
  recognitionError: string | null;
  onToggleRecording: () => void;
  transcript: string;
  questionNumber: number;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  answer,
  onAnswerChange,
  onSubmit,
  isLoading,
  isSubmittingAnswer,
  isLastQuestion,
  detectedRole,
  isBrowserSupported,
  listening,
  recognitionError,
  onToggleRecording,
  transcript,
  questionNumber
}) => {
  const t = useTranslations('interviewSimulator.questionDisplay');
  const answerTextareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('questionNumber', { number: questionNumber })}
            </h2>
            {detectedRole && (
              <p className="text-sm text-gray-500">
                {t('detectedRole')}: <span className="font-medium">{detectedRole}</span>
              </p>
            )}
          </div>
          {question && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {question.type.charAt(0).toUpperCase() + question.type.slice(1)}
            </span>
          )}
        </div>

        {question && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-gray-800">
              {question.text.replace(/^\d+\.?\s*/, '')}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700">
                {t('yourAnswer')}
              </label>
              <div className="flex items-center">
                {!isBrowserSupported && (
                  <span className="text-xs text-yellow-600 mr-2">
                    {t('browserNotSupported')}
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
                    onClick={onToggleRecording}
                    disabled={isLoading}
                    className={`p-2 rounded-full ${
                      isLoading 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : listening 
                          ? 'text-red-500 animate-pulse' 
                          : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title={isLoading ? t('loadingStates.processingResponse') : listening ? t('stopRecording') : t('startRecording')}
                  >
                    {isLoading ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    ) : listening ? (
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <span className="text-xs">{t('stop')}</span>
                      </div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
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
                onChange={(e) => !isSubmittingAnswer && onAnswerChange(e.target.value)}
                className={`w-full px-3 py-2 border ${isSubmittingAnswer ? 'bg-gray-100' : 'bg-white'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 pr-10`}
                rows={4}
                disabled={isSubmittingAnswer}
                placeholder={isSubmittingAnswer ? t('processingPlaceholder') : (isBrowserSupported ? t('speakOrTypePlaceholder') : t('typePlaceholder'))}
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
                {t('speakNow')} {transcript && !transcript.endsWith(' ') && '✓'}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={onSubmit}
              disabled={isLoading || !answer.trim()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('loadingStates.processingResponse')}
                </span>
              ) : (
                isLastQuestion ? t('submit') : t('nextQuestion')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
