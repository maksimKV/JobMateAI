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
    [key: string]: string | string[] | number | boolean | undefined; // Allow additional properties with specific types
  };
  language?: string;
}

export interface JobSkills {
  skills: string[];
  technologies: string[];
  soft_skills: string[];
}

export interface MissingSkill {
  text: string;
  action?: 'add' | 'highlight' | 'suggest';
}

export type SkillType = string | MissingSkill;

export interface SuggestionsObject {
  missing_skills: SkillType[];
}

export type SuggestionsType = Suggestion[] | SuggestionsObject;

// Type guards
export function isSuggestionsArray(suggestions: SuggestionsType): suggestions is Suggestion[] {
  return Array.isArray(suggestions);
}

export function isSuggestionsObject(suggestions: SuggestionsType): suggestions is SuggestionsObject {
  return !Array.isArray(suggestions) && 'missing_skills' in suggestions;
}

export function isMissingSkill(skill: SkillType): skill is MissingSkill {
  return typeof skill !== 'string' && 'text' in skill;
}

export interface JobMatchResponse {
  success: boolean;
  message: string;
  match_score: number;
  job_skills: JobSkills;
  cv_skills: JobSkills;
  suggestions?: SuggestionsType;
  missing_skills?: SkillType[];
  matched_skills?: SkillType[];
  language: string;
  score_interpretation: string;
  
  // For backward compatibility
  match_percent?: number;
  soft_skill_percent?: number;
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
