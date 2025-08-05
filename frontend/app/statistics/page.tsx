'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Navigation from '@/components/Navigation';
import { statisticsAPI, APIError } from '@/lib/api';
import { 
  StatisticsRequest, 
  StatisticsResponse, 
  FeedbackItem, 
  SessionData 
} from '@/types';
import { Loader2, AlertCircle, BarChart2, Download } from 'lucide-react';
import { SessionInfo } from './components/SessionInfo';
import { QuestionsList } from './components/QuestionsList';
import { ChartsSection } from './components/ChartsSection';
import { generatePdf } from '@/lib/pdf';

// Number of questions to show per page
const QUESTIONS_PER_PAGE = 1;

type QuestionType = 'all' | 'hr' | 'technical' | 'non_technical';

export default function StatisticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [questionType, setQuestionType] = useState<QuestionType>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Check if there are HR, Technical, or Non-Technical questions
  const hasHRQuestions = useMemo(() => {
    return sessionData?.feedback?.some(item => 
      item.type?.toLowerCase() === 'hr'
    ) || false;
  }, [sessionData]);

  const hasTechnicalQuestions = useMemo(() => {
    return sessionData?.feedback?.some(item => {
      const type = item.type?.toLowerCase();
      return type === 'technical' || type === 'tech_theory' || type === 'tech_practical';
    }) || false;
  }, [sessionData]);

  const hasNonTechnicalQuestions = useMemo(() => {
    return sessionData?.feedback?.some(item => 
      item.type?.toLowerCase() === 'non_technical'
    ) || false;
  }, [sessionData]);
  
  // Calculate total pages when sessionData or questionType changes
  useEffect(() => {
    if (sessionData?.feedback) {
      const filterQuestionsByType = (questions: FeedbackItem[]) => {
        if (!questions) return [];
        if (questionType === 'all') return [...questions];
        return questions.filter(question => {
          const qType = question.type?.toLowerCase();
          if (questionType === 'technical') {
            return qType === 'technical' || qType === 'tech_theory' || qType === 'tech_practical';
          }
          return qType === questionType;
        });
      };
      
      const filteredQuestions = filterQuestionsByType(sessionData.feedback);
      const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE) || 1;
      setTotalPages(totalPages);
      
      // Reset to first page if current page is out of bounds
      if (currentPage > totalPages) {
        setCurrentPage(1);
      }
    }
  }, [sessionData, questionType, currentPage]);
  
  // Get current questions based on pagination and filter
  const getCurrentQuestions = useMemo(() => {
    const filterQuestionsByType = (questions: FeedbackItem[]) => {
      if (!questions) return [];
      if (questionType === 'all') return [...questions];
      return questions.filter(question => {
        const qType = question.type?.toLowerCase();
        if (questionType === 'technical') {
          return qType === 'technical' || qType === 'tech_theory' || qType === 'tech_practical';
        }
        return qType === questionType;
      });
    };
    
    if (!sessionData?.feedback) return [];
    
    // Filter questions by type
    const filteredQuestions = filterQuestionsByType(sessionData.feedback);
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
    const endIndex = startIndex + QUESTIONS_PER_PAGE;
    
    return filteredQuestions.slice(startIndex, endIndex);
  }, [sessionData?.feedback, questionType, currentPage]);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of questions section
    const questionsSection = document.getElementById('questions-section');
    if (questionsSection) {
      questionsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Handle question type change
  const handleTypeChange = (type: QuestionType) => {
    setQuestionType(type);
    setCurrentPage(1); // Reset to first page when changing question type
  };
  
  // Define fetchStatistics with useCallback to prevent infinite loops
  const fetchStatistics = useCallback(async (id: string) => {
    console.log('Fetching statistics for session:', id);
    setIsLoading(true);
    setError(null);
    setStats(null);
    
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      const req: StatisticsRequest = { session_id: id };
      console.log('Sending request to API with data:', req);
      
      // Add a timeout to the fetch request
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await statisticsAPI.getCharts(req);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      console.log('Received response from API:', response);
      
      if (response) {
        console.log('Statistics data:', response);
        setStats(response);
      } else {
        console.error('Empty response from server');
        setError('Failed to load statistics. Please try again.');
      }
    } catch (err) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      console.error('Error fetching statistics:', err);
      
      if (err instanceof APIError) {
        setError(err.message);
      } else if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err instanceof Error) {
        setError(`An error occurred: ${err.message}`);
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const savedSession = localStorage.getItem('interviewSession');
        
        if (savedSession) {
          try {
            const session = JSON.parse(savedSession);
            console.log('Parsed session data:', session);
            
            // Set session data first
            if (session && typeof session === 'object' && 'sessionId' in session && 'feedback' in session) {
              setSessionData(session as SessionData);
              
              if (session.sessionId) {
                console.log('Found session ID, fetching statistics...');
                await fetchStatistics(session.sessionId);
              } else {
                console.log('No session ID found in session data');
                setError('No valid session ID found. Please complete an interview first.');
              }
            } else {
              console.error('Invalid session data structure:', session);
              setError('Invalid session data format. Please complete a new interview.');
            }
          } catch (parseError) {
            console.error('Error parsing session data:', parseError);
            setError('Invalid session data. Please complete a new interview.');
          }
        } else {
          console.log('No saved session found in localStorage');
          setError('No interview session found. Please complete an interview first.');
        }
      } catch (err) {
        console.error('Error in loadSessionData:', err);
        setError('Failed to load interview session data. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // Cleanup function
    return () => {
      console.log('Cleaning up statistics page...');
    };
  }, [fetchStatistics]);

  // Handle PDF download
  const handleDownloadPdf = useCallback(async () => {
    if (!contentRef.current) return;
    
    setIsGeneratingPdf(true);
    try {
      // Get the current date in the format: DD Month YYYY (e.g., 05 August 2025)
      const formatDate = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
      };
      
      // Get company name and position from session data or use defaults
      console.log('Session data when generating PDF:', sessionData);
      const companyName = sessionData?.company_name || 'Company';
      const position = sessionData?.position ? `, for ${sessionData.position}` : '';
      console.log('Using company name:', companyName, 'Position:', sessionData?.position);
      const formattedDate = formatDate(new Date());
      const filename = `Test interview for ${companyName} statistics${position} - ${formattedDate}`;
      
      // Get all questions regardless of pagination
      const allQuestions = sessionData?.feedback || [];
      
      // Create a properly typed sessionData object for the PDF
      const pdfSessionData = stats?.scores ? {
        scores: {
          byCategory: {
            hr: {
              average: stats.scores.by_category?.hr?.score || 0,
              count: stats.scores.by_category?.hr?.total_questions || 0
            },
            technical: {
              // Combine tech_theory and tech_practical for technical category
              average: stats.scores.by_category?.tech_theory?.score || 
                      stats.scores.by_category?.tech_practical?.score || 0,
              count: (stats.scores.by_category?.tech_theory?.total_questions || 0) + 
                    (stats.scores.by_category?.tech_practical?.total_questions || 0)
            },
            non_technical: {
              average: stats.scores.by_category?.non_technical?.score || 0,
              count: stats.scores.by_category?.non_technical?.total_questions || 0
            }
          },
          overallAverage: stats.scores.overall?.average || 0
        }
      } : undefined;

      await generatePdf(contentRef.current, filename, {
        includeCharts: true,
        includeQuestions: true,
        allQuestions,
        sessionData: pdfSessionData
      });
      
      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [sessionData, stats]);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-2">
              <Loader2 className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Loading...</h1>
            </div>
            <p className="text-gray-600">Please wait while we load your interview statistics...</p>
          </div>
        </main>
      </div>
    );
  }

  // Main render with unified state handling
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Centered Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <BarChart2 className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Interview Statistics</h1>
          </div>
          <p className="text-gray-600">View detailed statistics and feedback from your interview sessions</p>
        </div>

        {/* Content wrapper for PDF generation */}
        <div ref={contentRef} className="bg-white rounded-lg shadow p-6">
          {/* Add a title that will only show in the PDF */}
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold text-center mb-2">Interview Statistics</h1>
            <p className="text-center text-gray-600 text-sm">
              Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mr-3" />
              <p className="text-gray-600">Loading your interview statistics...</p>
            </div>
          ) : error ? (
            <div className="space-y-6">
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-700">{error}</p>
                    <p className="text-sm text-red-600 mt-1">
                      {error.includes('No interview session')
                        ? 'Please complete an interview first to see your statistics.'
                        : 'Please try again later or contact support if the issue persists.'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h2 className="text-lg font-semibold text-blue-800 mb-2">What to do next?</h2>
                <ul className="list-disc pl-5 space-y-1 text-blue-700">
                  <li>Start a new interview session from the dashboard</li>
                  <li>Complete all interview questions to generate statistics</li>
                  <li>Return to the dashboard to view your interview history</li>
                </ul>
              </div>
            </div>
          ) : !stats || !sessionData?.feedback?.length ? (
            <div className="text-center py-12">
              <BarChart2 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-medium text-gray-900">No Interview Data Found</h2>
              <p className="mt-2 text-gray-600 max-w-md mx-auto">
                Complete an interview session to view your detailed statistics and performance analysis.
              </p>
              <div className="mt-6">
                <a
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Session Info with Download PDF Button */}
              <SessionInfo 
                sessionData={sessionData}
                actionButton={
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    title="Download full report as PDF"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="-ml-1 mr-2 h-4 w-4" />
                        Download PDF
                      </>
                    )}
                  </button>
                }
              />
              
              {/* Charts Section */}
              <div className="mt-8">
                <ChartsSection stats={stats} />
              </div>
              
              {/* Questions List */}
              <div id="questions-section" className="mt-8">
                <QuestionsList 
                  questions={getCurrentQuestions}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  questionType={questionType}
                  hasHRQuestions={hasHRQuestions}
                  hasTechnicalQuestions={hasTechnicalQuestions}
                  hasNonTechnicalQuestions={hasNonTechnicalQuestions}
                  onPageChange={handlePageChange}
                  onTypeChange={handleTypeChange}
                  questionsPerPage={QUESTIONS_PER_PAGE}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Add some print-specific styles
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    .printable-content, .printable-content * {
      visibility: visible;
    }
    .printable-content {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
    /* Hide elements that shouldn't be in the PDF */
    .no-print, .no-print * {
      display: none !important;
    }
  }
`;

// Add the print styles to the document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = printStyles;
  document.head.appendChild(styleElement);
}