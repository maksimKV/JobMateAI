import React from 'react';
import { InterviewType } from '@/types';

interface InterviewLengths {
  [key: string]: { 
    label: string; 
    questions: number | { [key: string]: number } 
  };
}

interface InterviewTypeSelectorProps {
  interviewType: InterviewType;
  onInterviewTypeChange: (type: InterviewType) => void;
  interviewLength: string;
  onInterviewLengthChange: (length: string) => void;
  jobDescription: string;
  onJobDescriptionChange: (desc: string) => void;
  onStartInterview: () => void;
  isLoading: boolean;
  interviewLengths: InterviewLengths;
}

const interviewTypes = [
  { value: 'hr' as const, label: 'HR Interview', description: 'Behavioral and situational questions' },
  { value: 'technical' as const, label: 'Technical Interview', description: 'Coding and technical questions' },
  { value: 'mixed' as const, label: 'Mixed Interview', description: 'Combination of HR and technical' },
  { value: 'non_technical' as const, label: 'Non-Technical', description: 'For non-technical roles' },
];

export const InterviewTypeSelector: React.FC<InterviewTypeSelectorProps> = ({
  interviewType,
  onInterviewTypeChange,
  interviewLength,
  onInterviewLengthChange,
  jobDescription,
  onJobDescriptionChange,
  onStartInterview,
  isLoading,
  interviewLengths,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="jobDescription" className="block text-gray-700 font-semibold mb-2">
          Job Description
        </label>
        <textarea
          id="jobDescription"
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
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
          {interviewTypes.map((type) => (
            <div 
              key={type.value}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                interviewType === type.value 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => onInterviewTypeChange(type.value)}
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
          {(Object.entries(interviewLengths) as [string, { label: string; questions: number | { [key: string]: number } }][])
            .map(([key, value]) => {
              const questions = value.questions;
              const questionCount = typeof questions === 'number' 
                ? questions 
                : Object.values(questions).reduce((sum: number, count: number) => sum + count, 0);
                
              return (
                <div 
                  key={key}
                  className={`p-4 border rounded-lg cursor-pointer text-center ${
                    interviewLength === key 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => onInterviewLengthChange(key)}
                >
                  <div className="font-medium text-gray-900">{value.label}</div>
                  <div className="text-sm text-gray-600">
                    {questionCount} {questionCount === 1 ? 'question' : 'questions'}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={onStartInterview}
          disabled={isLoading || !jobDescription.trim()}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Preparing Interview...
            </>
          ) : (
            'Start Interview'
          )}
        </button>
      </div>
    </div>
  );
};
