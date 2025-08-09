'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { InterviewFeedback } from '../types';
import { CheckCircle, AlertTriangle, Code, Users, MessageSquare, BarChart, HelpCircle, MessageSquareText, User, Bot } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FeedbackDisplayProps {
  feedback: InterviewFeedback[];
  question?: string;
  answer?: string;
  showFullContext?: boolean;
  questionNumber?: number;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ 
  feedback, 
  question, 
  answer, 
  showFullContext = false,
  questionNumber
}) => {
  const t = useTranslations('interviewSimulator.feedbackDisplay');
  
  if (feedback.length === 0) return null;

  const latestFeedback = feedback[feedback.length - 1];
  const displayQuestion = (question || latestFeedback.question || '').replace(/^\d+\.?\s*/, '');
  const displayAnswer = answer || latestFeedback.answer || '';
  const displayEvaluation = latestFeedback.evaluation || '';

  // Parse the evaluation text into sections
  const parseEvaluationSections = (evaluation: string) => {
    const sections: Record<string, string> = {};
    const sectionRegex = /##\s*(.+?)\n([\s\S]*?)(?=##|$)/g;
    let match;
    
    while ((match = sectionRegex.exec(evaluation)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();
      sections[title] = content;
    }
    
    return sections;
  };
  
  const sections = parseEvaluationSections(displayEvaluation);
  
  // Define section metadata including icons, tooltips, and accessibility attributes
  const sectionConfig = [
    { 
      key: 'Strengths', 
      icon: CheckCircle, 
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      ariaLabel: 'Strengths of the answer',
      tooltip: 'Key aspects of your answer that were particularly effective or well-articulated.'
    },
    { 
      key: 'Areas for Improvement', 
      icon: AlertTriangle, 
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      ariaLabel: 'Areas for improvement',
      tooltip: 'Specific aspects of your answer that could be enhanced for better impact.'
    },
    { 
      key: 'Technical Accuracy', 
      icon: Code, 
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      ariaLabel: 'Technical accuracy evaluation',
      tooltip: 'Evaluation of the technical correctness and precision in your response.'
    },
    { 
      key: 'Behavioral Example', 
      icon: Users, 
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
      ariaLabel: 'Behavioral example',
      tooltip: 'Example of a strong behavioral response using the STAR method (Situation, Task, Action, Result).'
    },
    { 
      key: 'Suggested Answer', 
      icon: MessageSquare, 
      iconColor: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
      ariaLabel: 'Suggested answer',
      tooltip: 'A model response that demonstrates an effective way to answer this question.'
    },
    { 
      key: 'Confidence Score', 
      icon: BarChart, 
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50',
      ariaLabel: 'Confidence score',
      tooltip: 'Rating from 1-10 based on the overall quality and completeness of your answer.'
    }
  ];

  return (
    <div className="space-y-6">
      {showFullContext ? (
        // Full context view (for CompletionScreen)
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900">{t('fullContext.title')}</h4>
            </div>
          </div>
          
          {/* Question & Answer Section */}
          <div className="space-y-6">
            <div className="flex flex-col items-center text-gray-900 mb-6">
              <div className="flex items-center justify-center mb-1">
                <MessageSquareText className="h-6 w-6 text-blue-600 mr-2" />
              </div>
              <h3 className="text-xl font-medium text-center">
                {t('fullContext.questionSection')}
              </h3>
            </div>
            <div className="space-y-4">
              {/* Question Section */}
              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <div className="flex items-center justify-between p-3 bg-blue-50">
                  <div className="flex items-center">
                    <MessageSquareText className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-sm font-medium text-gray-900" aria-label="Interview question">
                      {t('fullContext.question')} {questionNumber && `#${questionNumber - 1}`}
                    </h3>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button" 
                          className="text-gray-400 hover:text-gray-600 focus:outline-none"
                          aria-label={t('aria.learnMore', { section: 'Question' })}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">The interview question you were asked to answer.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="p-4">
                  <p className="text-gray-700 whitespace-pre-line">{displayQuestion}</p>
                </div>
              </div>

              {/* Answer Section */}
              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100 mb-6">
                <div className="flex items-center justify-between p-3 bg-green-50">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="text-sm font-medium text-gray-900" aria-label="Your answer">
                      {t('fullContext.yourAnswer')}
                    </h3>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button" 
                          className="text-gray-400 hover:text-gray-600 focus:outline-none"
                          aria-label={t('aria.learnMore', { section: 'Your Answer' })}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">The answer you provided to the interview question.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="p-4">
                  <p className="text-gray-700 whitespace-pre-line">{displayAnswer}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Feedback Section */}
          <div className="space-y-4 mt-8">
            <div className="flex flex-col items-center text-gray-900 mb-6">
              <div className="flex items-center justify-center mb-1">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-medium text-center">
                {t('fullContext.feedbackSection')}
              </h3>
            </div>
            <div className="bg-blue-50 rounded-lg shadow overflow-hidden border border-blue-100">
              <div className="p-4 space-y-4">
                {sectionConfig.map(({ key, icon: Icon, iconColor, bgColor, ariaLabel, tooltip }) => {
                  if (!sections[key]) return null;
                  
                  return (
                    <div key={key} className="rounded-lg overflow-hidden border border-gray-200">
                      <div className={`flex items-center justify-between p-3 ${bgColor}`}>
                        <div className="flex items-center">
                          <Icon className={`h-5 w-5 mr-2 ${iconColor}`} aria-hidden="true" />
                          <h6 className="text-sm font-medium text-gray-900" aria-label={ariaLabel}>
                            {key}
                          </h6>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                type="button" 
                                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                aria-label={t('aria.learnMore', { section: key })}
                              >
                                <HelpCircle className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="p-4 bg-white">
                        <p className="text-gray-700 whitespace-pre-line">
                          {sections[key]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Compact view (for in-interview feedback)
        <div className="space-y-6">
          <div className="space-y-6">
            <div className="flex flex-col items-center text-gray-900 mb-6">
              <div className="flex items-center justify-center mb-1">
                <MessageSquareText className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-medium text-center">
                {t('fullContext.questionSection')}
              </h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <div className="flex items-center justify-between p-3 bg-blue-50">
                  <div className="flex items-center">
                    <MessageSquareText className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900" aria-label="Interview question">
                      {t('fullContext.question')} {questionNumber && `#${questionNumber - 1}`}
                    </span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button" 
                          className="text-gray-400 hover:text-gray-600 focus:outline-none"
                          aria-label={t('aria.learnMore', { section: 'Question' })}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">The interview question you were asked to answer.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="p-4">
                  <p className="text-gray-700 text-sm">{displayQuestion}</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <div className="flex items-center justify-between p-3 bg-green-50">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900" aria-label="Your answer">
                      {t('fullContext.yourAnswer')}
                    </span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button" 
                          className="text-gray-400 hover:text-gray-600 focus:outline-none"
                          aria-label={t('aria.learnMore', { section: 'Your Answer' })}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">The answer you provided to the interview question.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="p-4">
                  <p className="text-gray-700 text-sm whitespace-pre-line">{displayAnswer}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* AI Feedback Section */}
          <div className="space-y-4 mt-8">
            <div className="flex flex-col items-center text-gray-900 mb-6">
              <div className="flex items-center justify-center mb-1">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-medium text-center">
                {t('fullContext.feedbackSection')}
              </h3>
            </div>
            <div className="bg-blue-50 rounded-lg shadow overflow-hidden border border-blue-100">
              <div className="p-4 space-y-4">
                {sectionConfig.map(({ key, icon: Icon, iconColor, bgColor, ariaLabel, tooltip }) => {
                  if (!sections[key]) return null;
                  
                  return (
                    <div key={key} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                      <div className={`flex items-center justify-between p-3 ${bgColor}`}>
                        <div className="flex items-center">
                          <Icon className={`h-5 w-5 mr-2 ${iconColor}`} aria-hidden="true" />
                          <h6 className="text-sm font-medium text-gray-900" aria-label={ariaLabel}>
                            {key}
                          </h6>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                type="button" 
                                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                aria-label={t('aria.learnMore', { section: key })}
                              >
                                <HelpCircle className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-700 whitespace-pre-line text-sm">
                          {sections[key]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};