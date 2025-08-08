// CV Analyzer Types
export interface ParsedData {
  raw_text: string;
  sections: {
    has_contact_info: boolean;
    has_education: boolean;
    has_experience: boolean;
    has_skills: boolean;
    has_projects: boolean;
    has_certifications: boolean;
    missing_sections: string[];
  };
  file_path: string;
  file_type: string;
  word_count: number;
  character_count: number;
  [key: string]: any; // Allow additional properties
}

export interface CVData {
  id: string;
  cv_id?: string;  // For backward compatibility
  filename: string;
  upload_timestamp: string;
  parsed_data: ParsedData;
  extracted_skills: string[];
  analysis: {
    analysis: string;
    type: string;
    provider: string;
    [key: string]: any; // Allow additional properties
  };
  [key: string]: any; // Allow additional properties
}

export interface CVUploadResponse {
  success: boolean;
  cv_id: string;
  filename: string;
  upload_timestamp?: string;
  parsed_data: ParsedData;
  extracted_skills: string[];
  analysis: {
    analysis: string;
    type: string;
    provider: string;
    [key: string]: any; // Allow additional properties
  };
  [key: string]: any; // Allow additional properties from backend
}

export interface CVListResponse {
  success: boolean;
  cvs: CVData[];
  total_cvs: number;
  message?: string;
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
  company_name: string;
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
export type InterviewType = 'hr' | 'technical' | 'mixed' | 'non_technical';
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

export const NON_TECHNICAL_LENGTHS: Record<InterviewLength, { label: string; questions: number }> = {
  short: { label: 'Short (4 questions)', questions: 4 },
  medium: { label: 'Medium (8 questions)', questions: 8 },
  long: { label: 'Long (12 questions)', questions: 12 },
};

export interface InterviewQuestionRequest {
  job_description: string;
  interview_type: InterviewType;
  length?: InterviewLength;
}

export interface InterviewQuestion {
  text: string;
  type: 'hr' | 'technical' | 'non_technical';
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
  detected_role?: string;
  detected_domain?: string;
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
    (obj.type === 'hr' || obj.type === 'technical' || obj.type === 'mixed' || obj.type === 'non_technical')
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
  detected_role?: string;
  detected_domain?: string;
  company_name?: string;
  position?: string;
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
  detected_role?: string;
  detected_domain?: string;
  company_name?: string;
  position?: string;
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
  score?: number;
}

export interface SessionData {
  sessionId: string;
  timestamp: string;
  questions: Array<{ text: string; type: string }>;
  feedback: FeedbackItem[];
  interviewType?: string;
  company_name?: string;
  position?: string;
  job_description?: string;
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
  has_data?: boolean;
  message?: string;
  error?: string;
  metadata: {
    has_hr: boolean;
    has_technical: boolean;
    has_tech_theory: boolean;
    has_tech_practical: boolean;
    total_questions: number;
  };
  session: {
    id: string;
    stage: string;
    interview_type: string;
    timestamp: string;
    questions: string[];
    feedback: any[];
  };
  scores: {
    overall: {
      total: number;
      average: number;
      max_possible: number;
    };
    by_category: {
      hr?: {
        score: number;
        total_questions: number;
        average: number;
      };
      tech_theory?: {
        score: number;
        total_questions: number;
        average: number;
      };
      tech_practical?: {
        score: number;
        total_questions: number;
        average: number;
      };
      non_technical?: {
        score: number;
        total_questions: number;
        average: number;
      };
    };
  };
  charts: {
    bar_chart?: {
      labels: string[];
      datasets: Array<{
        label: string;
        data: number[];
        backgroundColor: string[];
        borderColor: string[];
        borderWidth: number;
      }>;
    };
    pie_chart?: {
      labels: string[];
      datasets: Array<{
        data: number[];
        backgroundColor: string[];
        borderColor: string[];
        borderWidth: number;
      }>;
    };
    line_chart?: {
      labels: string[];
      datasets: Array<{
        label: string;
        data: number[];
        fill: boolean;
        borderColor: string;
        tension: number;
      }>;
    };
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