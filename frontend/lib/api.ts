import { CVUploadResponse, CVData, CoverLetterRequest, CoverLetterResponse, JobMatchRequest, JobMatchResponse, InterviewQuestionRequest, InterviewQuestionResponse, AnswerSubmissionRequest, AnswerSubmissionResponse, StatisticsRequest, StatisticsResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(response.status, errorData.detail || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(500, 'Network error');
  }
}

// CV Analyzer API
export const cvAPI = {
  upload: async (file: File): Promise<CVUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/api/cv/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(response.status, errorData.detail || errorData.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: data.success,
      cv_id: data.cv_id,
      filename: data.filename,
      analysis: data.analysis || {},
      parsed_data: data.parsed_data || {},
      extracted_skills: data.extracted_skills || []
    };
  },

  getAnalysis: async (cvId: string): Promise<CVData> => {
    const data = await apiRequest<CVData>(`/api/cv/${cvId}`);
    return {
      id: data.cv_id || cvId,
      filename: data.filename || '',
      upload_timestamp: data.upload_timestamp || new Date().toISOString(),
      parsed_data: data.parsed_data || {},
      extracted_skills: data.extracted_skills || [],
      analysis: data.analysis || {}
    };
  },

  getSkills: async (cvId: string) => {
    return apiRequest(`/api/cv/${cvId}/skills`);
  },

  list: async () => {
    const response = await apiRequest<{ cvs: CVData[] }>('/api/cv/list');
    return {
      cvs: response.cvs || [],
      total_cvs: response.cvs?.length || 0
    };
  },

  delete: async (cvId: string) => {
    return apiRequest(`/api/cv/${cvId}`, { method: 'DELETE' });
  },
};

// Cover Letter API
export const coverLetterAPI = {
  generate: async (data: CoverLetterRequest): Promise<CoverLetterResponse> => {
    return apiRequest<CoverLetterResponse>('/api/cover-letter/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Job Scanner API
export const jobScannerAPI = {
  match: async (data: JobMatchRequest): Promise<JobMatchResponse> => {
    return apiRequest<JobMatchResponse>('/api/job-scanner/match', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Interview Simulator API
export const interviewAPI = {
  generateQuestions: async (data: InterviewQuestionRequest): Promise<InterviewQuestionResponse> => {
    return apiRequest<InterviewQuestionResponse>('/api/interview/generate-questions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  submitAnswer: async (data: AnswerSubmissionRequest): Promise<AnswerSubmissionResponse> => {
    return apiRequest<AnswerSubmissionResponse>('/api/interview/submit-answer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSession: async (sessionId: string) => {
    return apiRequest(`/api/interview/session/${sessionId}`);
  },
};

// Code Reviewer API
export const codeReviewAPI = {
  review: async (code: string): Promise<{ success: boolean; review: string; detected_language: string }> => {
    return apiRequest<{ success: boolean; review: string; detected_language: string }>('/api/code-review/review', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
};

// Statistics API
export const statisticsAPI = {
  getCharts: async (data: StatisticsRequest): Promise<StatisticsResponse> => {
    return apiRequest<StatisticsResponse>('/api/statistics/charts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export { APIError }; 