'use client';

import { InterviewType } from '@/types';

export type QuestionType = 'hr' | 'technical' | 'non_technical';

export interface InterviewQuestion {
  text: string;
  type: QuestionType;
}

export interface InterviewFeedback {
  question: string;
  answer: string;
  evaluation: string;
  type: QuestionType;
  score?: number;
  question_type?: 'hr' | 'technical_theory' | 'technical_practical';
}

export interface InterviewSessionState {
  sessionId: string | null;
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  feedback: InterviewFeedback[];
  interviewType: InterviewType;
  isComplete: boolean;
  detected_role?: string;
  detected_domain?: string;
  company_name?: string;
  position?: string;
  job_description?: string;
}

export const initialSessionState: InterviewSessionState = {
  sessionId: null,
  questions: [],
  currentQuestionIndex: 0,
  feedback: [],
  interviewType: 'hr',
  isComplete: false,
  job_description: ''
};

export const INTERVIEW_LENGTHS = {
  short: { questions: 4 },
  medium: { questions: 8 },
  long: { questions: 12 }
} as const;

export const MIXED_INTERVIEW_LENGTHS = {
  short: { questions: { hr: 4, technical: 4 } },
  medium: { questions: { hr: 8, technical: 8 } },
  long: { questions: { hr: 12, technical: 12 } }
} as const;

export const NON_TECHNICAL_LENGTHS = {
  short: { questions: 4 },
  medium: { questions: 8 },
  long: { questions: 12 }
} as const;
