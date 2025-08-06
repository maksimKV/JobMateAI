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
  job_description: string;
}

export interface JobMatchResponse {
  success: boolean;
  match_percent: number;
  soft_skill_percent?: number;
  suggestions?: Suggestion[];
  matched_skills?: string[];
  missing_skills?: string[];
  matched_soft_skills?: string[];
  missing_soft_skills?: string[];
  job_info?: {
    skills: string[];
    technologies: string[];
    soft_skills: string[];
  };
  _debug?: {
    cv_skills?: string[];
    job_skills?: string[] | Set<string>;
    job_technologies?: string[];
    job_soft_skills?: string[] | Set<string>;
    formatted_job_info?: Record<string, unknown>;
  };
}
