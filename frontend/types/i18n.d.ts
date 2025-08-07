// Type definitions for i18n messages
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace IntlMessages {
    interface Navigation {
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
    }

    interface Common {
      welcome: string;
      language: {
        en: string;
        bg: string;
        select: string;
      };
    }
  }
}

export {};
