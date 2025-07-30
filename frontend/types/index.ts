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
export interface InterviewQuestionRequest {
  job_description: string;
  stage: 'hr' | 'technical';
}

export interface InterviewQuestionResponse {
  success: boolean;
  session_id: string;
  questions: string;
  stage: string;
}

export interface AnswerSubmissionRequest {
  session_id: string;
  question: string;
  answer: string;
  question_type: string;
}

export interface AnswerSubmissionResponse {
  success: boolean;
  feedback: {
    evaluation: string;
    question: string;
    answer: string;
    type: string;
  };
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
export interface StatisticsRequest {
  session_id: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label?: string;
    data: number[];
  }>;
}

export interface StatisticsResponse {
  success: boolean;
  bar_chart: ChartData;
  pie_chart: ChartData;
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