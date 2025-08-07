// Common translations type
type CommonTranslations = {
  // Add common translation keys here
  [key: string]: string | Record<string, string>;
};

// Navigation translations type
type NavigationTranslations = {
  home: string;
  cvAnalyzer: string;
  cvAnalyzerDesc: string;
  coverLetter: string;
  coverLetterDesc: string;
  jobScanner: string;
  jobScannerDesc: string;
  interviewSimulator: string;
  interviewSimulatorDesc: string;
  codeReviewer: string;
  codeReviewerDesc: string;
  statistics: string;
  statisticsDesc: string;
  // Add other navigation keys as needed
};

// CV Analyzer translations type
type CVAnalyzerTranslations = {
  title: string;
  description: string;
  myCVs: string;
  uploadedCVs: string;
  noCVs: string;
  defaults: {
    untitled: string;
  };
  buttons: {
    showList: string;
    hideList: string;
    delete: string;
  };
  upload: {
    title: string;
    dragActive: string;
    dragInactive: string;
    selectFile: string;
    uploading: string;
    uploadButton: string;
    supportedFormats: string;
  };
  analysis: {
    title: string;
    fileInfo: string;
    filename: string;
    wordCount: string;
    skillsFound: string;
    skillsDetected: string;
    structure: {
      title: string;
      contactInfo: string;
      education: string;
      experience: string;
      skills: string;
      projects: string;
      certifications: string;
    };
    missingSections: string;
    detectedSkills: string;
    aiFeedback: string;
  };
  confirmDelete: string;
  errors: {
    loadList: string;
    loadDetails: string;
    invalidFile: string;
    unexpected: string;
    deleteFailed: string;
  };
};

// Code Reviewer translations type
type CodeReviewerTranslations = {
  title: string;
  description: string;
  form: {
    codeInput: {
      label: string;
      placeholder: string;
    };
    buttons: {
      review: string;
      reviewing: string;
    };
  };
  result: {
    detectedLanguage: string;
  };
  errors: {
    unexpected: string;
  };
};

// Job Scanner translations type
type JobScannerTranslations = {
  title: string;
  description: string;
  // Add job scanner specific fields as needed
};

// Interview Simulator translations type
type InterviewSimulatorTranslations = {
  page: Record<string, string>;
  session: Record<string, string>;
  interviewTypeSelector: Record<string, string>;
  // Add other interview simulator specific fields as needed
};

// Cover Letter translations type
type CoverLetterTranslations = {
  title: string;
  description: string;
  defaultCompanyName: string;
  form: {
    selectCV: string;
    noCVs: string;
    jobDescription: string;
    jobDescriptionPlaceholder: string;
    clear: string;
    clearButton: string;
    language: string;
    languages: {
      english: string;
      bulgarian: string;
    };
    buttons: {
      generate: string;
      generating: string;
    };
  };
  result: {
    title: string;
    copyButton: string;
    copyTooltip: string;
    downloadPdf: string;
    generatingPdf: string;
  };
  errors: {
    generationFailed: string;
    pdfGenerationFailed: string;
  };
};

// Statistics translations type
type StatisticsTranslations = {
  title: string;
  description: string;
  // Add statistics specific fields as needed
};

// Home page translations type
interface HomeTranslations {
  title: string;
  subtitle: string;
  features: {
    [key: string]: {
      title: string;
      description: string;
      cta: string;
    };
  };
  gettingStarted: {
    title: string;
    description: string;
    uploadButton: string;
    learnMoreButton: string;
  };
}

// Main messages type
export interface Messages {
  common: CommonTranslations;
  navigation: NavigationTranslations;
  home: HomeTranslations;
  cvAnalyzer: CVAnalyzerTranslations;
  codeReviewer: CodeReviewerTranslations;
  jobScanner: JobScannerTranslations;
  interviewSimulator: InterviewSimulatorTranslations;
  coverLetter: CoverLetterTranslations;
  statistics: StatisticsTranslations;
}

declare module '*.json' {
  const value: Record<string, unknown>;
  export default value;
}

export {}; // This makes the file a module
