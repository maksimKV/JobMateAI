// CV Analyzer Types
export interface CVData {
  id: string;
  filename: string;
  analysis: {
    structure: {
      has_contact_info: boolean;
      has_education: boolean;
      has_experience: boolean;
      has_skills: boolean;
      has_projects: boolean;
      has_certifications: boolean;
      missing_sections: string[];
    };
    ai_feedback: string;
    extracted_skills: string[];
    word_count: number;
    missing_sections: string[];
  };
}

export interface CVUploadResponse {
  success: boolean;
  cv_id: string;
  filename: string;
  analysis: CVData['analysis'];
}

// Cover Letter Types
export interface CoverLetterRequest {
  cv_id: string;
  job_description: string;
  language: string;
}

export interface CoverLetterResponse {
  success: boolean;
  cover_letter: string;
  language: string;
}

// Job Scanner Types
export interface JobMatchRequest {
  cv_id: string;
  job_description: string;
}

export interface JobMatchResponse {
  success: boolean;
  match_percent: number;
  matched_skills: string[];
  missing_skills: string[];
  soft_skill_percent: number;
  matched_soft_skills: string[];
  missing_soft_skills: string[];
  job_info: {
    skills: string[];
    technologies: string[];
    soft_skills: string[];
  };
}

// Interview Simulator Types
export type InterviewType = 'hr' | 'technical' | 'mixed';
export type InterviewLength = 'short' | 'medium' | 'long';

export const INTERVIEW_LENGTHS: Record<InterviewLength, { label: string; questions: number }> = {
  short: { label: 'Short (4 questions)', questions: 4 },
  medium: { label: 'Medium (8 questions)', questions: 8 },
  long: { label: 'Long (12 questions)', questions: 12 },
};

export const MIXED_INTERVIEW_LENGTHS: Record<InterviewLength, { label: string; questions: { hr: number; technical: number } }> = {
  short: { label: 'Short (8 questions)', questions: { hr: 4, technical: 4 } },
  medium: { label: 'Medium (16 questions)', questions: { hr: 8, technical: 8 } },
  long: { label: 'Long (24 questions)', questions: { hr: 12, technical: 12 } },
};

export interface InterviewQuestionRequest {
  job_description: string;
  interview_type: InterviewType;
  length?: InterviewLength;
}

export interface InterviewQuestion {
  text: string;
  type: 'hr' | 'technical'; // Only these two types are valid for individual questions
}

export interface InterviewFeedback {
  question: string;
  answer: string;
  evaluation: string;
  type: InterviewType;
  score?: number;
  question_type?: 'hr' | 'technical_theory' | 'technical_practical';
}

export interface InterviewSession extends InterviewSessionState {
  questions: InterviewQuestion[];
  feedback: InterviewFeedback[];
}

// Type guard to check if an object is of type InterviewFeedback
export const isInterviewFeedback = (obj: any): obj is InterviewFeedback => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'question' in obj &&
    'answer' in obj &&
    'evaluation' in obj &&
    'type' in obj &&
    (obj.type === 'hr' || obj.type === 'technical' || obj.type === 'mixed')
  );
};

export interface InterviewQuestionResponse {
  success: boolean;
  session_id: string;
  interview_type: InterviewType;
  next_question?: string;
  is_complete: boolean;
  current_question: string;
  question_type: string;
  question_number: number;
}

export interface QuestionData {
  text: string;
  type: InterviewType;
}

export interface AnswerSubmissionRequest {
  session_id: string;
  answer: string;
}

export interface AnswerSubmissionResponse {
  success: boolean;
  feedback: InterviewFeedback;
  next_question?: string;
  question_type?: InterviewType;
  question_number?: number;
  is_complete: boolean;
}

export interface InterviewSessionState {
  sessionId: string | null;
  questions: QuestionData[];
  currentQuestionIndex: number;
  feedback: InterviewFeedback[];
  interviewType: InterviewType;
  isComplete: boolean;
}

// Code Reviewer Types
export interface CodeReviewRequest {
  code: string;
  language: string;
}

export interface CodeReviewResponse {
  success: boolean;
  review: string;
}

// Statistics Types
export interface ChartDataset {
  data: number[];
  backgroundColor?: string[];
  borderColor?: string[];
  borderWidth?: number;
  label?: string;
  fill?: boolean;
  tension?: number;
}

export interface ProcessedChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface FeedbackItem {
  question: string;
  answer: string;
  evaluation: string;
  type?: string;
}

export interface SessionData {
  sessionId: string;
  timestamp: string;
  questions: Array<{ text: string; type: string }>;
  feedback: FeedbackItem[];
  interviewType?: string;
}

export interface StatisticsRequest {
  session_id: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }>;
}

export interface ScoreBreakdown {
  score: number;
  total_questions: number;
}

export interface StatisticsResponse {
  success: boolean;
  session: {
    id: string;
    stage: string;
    timestamp: string;
    questions: string[];
    feedback: InterviewFeedback[];
    interviewType: string;
  };
  scores: {
    overall: {
      total: number;
      average: number;
      max_possible: number;
    };
    by_category: {
      hr: ScoreBreakdown;
      tech_theory: ScoreBreakdown;
      tech_practical: ScoreBreakdown;
    };
  };
  charts: {
    bar_chart: ChartData;
    pie_chart: ChartData;
    line_chart: ChartData;
  };
}

// Navigation Types
export type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

// API Error Types
export interface APIError {
  detail: string;
  status_code: number;
} 