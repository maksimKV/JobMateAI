export interface SuggestionItem {
  text: string;
  action: 'add' | 'highlight' | 'suggest';
}

export interface Suggestion {
  id: string;
  title: string;
  icon: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  items: SuggestionItem[];
  description: string;
}

export interface JobMatchRequest {
  cv_id: string;
  job_description: string | {
    raw_text: string;
    [key: string]: any; // Allow additional properties
  };
  language?: string;
}

export interface JobSkills {
  skills: string[];
  technologies: string[];
  soft_skills: string[];
}

export interface JobMatchResponse {
  success: boolean;
  message: string;
  match_score: number;
  job_skills: JobSkills;
  cv_skills: JobSkills;
  suggestions: {
    missing_skills: string[];
    [key: string]: any; // Allow additional suggestion properties
  };
  missing_skills: string[];
  language: string;
  score_interpretation: string;
  
  // For backward compatibility
  match_percent?: number;
  soft_skill_percent?: number;
  matched_skills?: string[];
  matched_soft_skills?: string[];
  missing_soft_skills?: string[];
  job_info?: JobSkills;
  _debug?: {
    cv_skills?: string[];
    job_skills?: string[] | Set<string>;
    job_technologies?: string[];
    job_soft_skills?: string[] | Set<string>;
    formatted_job_info?: Record<string, unknown>;
  };
}
