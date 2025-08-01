'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import { statisticsAPI, APIError } from '@/lib/api';
import { 
  StatisticsRequest, 
  StatisticsResponse, 
  FeedbackItem, 
  SessionData 
} from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';
import { SessionInfo } from './components/SessionInfo';
import { QuestionsList } from './components/QuestionsList';
import { ChartsSection } from './components/ChartsSection';

// Number of questions to show per page
const QUESTIONS_PER_PAGE = 1;

type QuestionType = 'all' | 'hr' | 'technical';

export default function StatisticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [questionType, setQuestionType] = useState<QuestionType>('all');
  
  // Check if there are HR or Technical questions based on metadata if available, otherwise fall back to feedback data
  const hasHRQuestions = stats?.metadata?.has_hr ?? sessionData?.feedback?.some(item => item.type === 'hr') ?? false;
  const hasTechnicalQuestions = stats?.metadata?.has_technical ?? 
    sessionData?.feedback?.some(item => item.type === 'technical' || item.type === 'tech_theory' || item.type === 'tech_practical') ?? false;
  
  // Calculate total pages when sessionData or questionType changes
  useEffect(() => {
    if (sessionData?.feedback) {
      // Define filter function inside useEffect to avoid dependency issues
      const filterQuestionsByType = (questions: FeedbackItem[]) => {
        if (!questions) return [];
        if (questionType === 'all') return [...questions];
        return questions.filter(question => question.type === questionType);
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
    // Define filter function inside useMemo to avoid dependency issues
    const filterQuestionsByType = (questions: FeedbackItem[]) => {
      if (!questions) return [];
      if (questionType === 'all') return [...questions];
      return questions.filter(question => question.type === questionType);
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

  // Load session data and statistics
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        console.log('Loading session data...');
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

    loadSessionData();
    
    // Cleanup function
    return () => {
      console.log('Cleaning up statistics page...');
    };
  }, [fetchStatistics]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your interview statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-700 font-medium">{error}</p>
              <p className="text-sm text-red-600 mt-1">
                {error.includes('No interview session')
                  ? 'Please complete an interview first to see your statistics.'
                  : 'Please try again later or contact support if the issue persists.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No statistics data available.</p>
        </div>
      </div>
    );
  }

  // Session data is now loaded in the main useEffect

  // Main render with unified state handling
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Interview Statistics</h1>
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mr-3" />
              <p className="text-gray-600">Loading your interview statistics...</p>
            </div>
          )}
          
          {/* Error State */}
          {error && !isLoading && (
            <div className="mb-6">
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      {error} {error.includes('No interview session') ? 'Please complete an interview first to see your statistics.' : 'Please try again later or contact support if the issue persists.'}
                    </p>
                  </div>
                </div>
              </div>
              
              {!sessionData && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h2 className="text-lg font-semibold text-blue-800 mb-2">What to do next?</h2>
                  <ul className="list-disc pl-5 space-y-1 text-blue-700">
                    <li>Start a new interview session from the dashboard</li>
                    <li>Complete all interview questions to generate statistics</li>
                    <li>Return to the dashboard to view your interview history</li>
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Session Info */}
          {!isLoading && !error && <SessionInfo sessionData={sessionData} />}
          
          {/* Charts Section */}
          <div className="mt-8">
            <ChartsSection stats={stats} />
          </div>
          
          {/* Questions List */}
          {!isLoading && !error && sessionData?.feedback && sessionData.feedback.length > 0 && (
            <div id="questions-section" className="mt-8">
              <QuestionsList 
                questions={getCurrentQuestions}
                currentPage={currentPage}
                totalPages={totalPages}
                questionType={questionType}
                hasHRQuestions={hasHRQuestions}
                hasTechnicalQuestions={hasTechnicalQuestions}
                onPageChange={handlePageChange}
                onTypeChange={handleTypeChange}
              />
            </div>
          )}
          
          {/* Empty State - No questions */}
          {!isLoading && !error && (!sessionData?.feedback || sessionData.feedback.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-500">No interview questions found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}