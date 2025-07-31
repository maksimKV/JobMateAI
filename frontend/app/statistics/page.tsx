'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { statisticsAPI, APIError } from '@/lib/api';
import { 
  StatisticsRequest, 
  StatisticsResponse, 
  ChartDataset, 
  ProcessedChartData, 
  FeedbackItem, 
  SessionData 
} from '@/types';
import { Pie } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend, Title, TooltipItem, TooltipModel } from 'chart.js';
import { Loader2, AlertCircle, PieChart } from 'lucide-react';

// Register Chart.js components
Chart.register(
  ArcElement,
  Tooltip,
  Legend,
  Title
);

// Chart options for pie chart
const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        pointStyle: 'circle',
        font: {
          size: 12
        }
      }
    },
    title: {
      display: true,
      text: 'Question Type Distribution',
      font: { 
        size: 16,
        weight: 'bold' as const  // Changed from '600' to 'bold' to match Chart.js type
      },
      padding: {
        top: 10,
        bottom: 20
      }
    },
    tooltip: {
      callbacks: {
        label: function(this: TooltipModel<'pie'>, tooltipItem: TooltipItem<'pie'>) {
          const label = tooltipItem.label || '';
          const value = tooltipItem.raw as number;
          const dataset = tooltipItem.dataset.data as number[];
          const total = dataset.reduce((a, b) => a + b, 0);
          const percentage = Math.round((value / total) * 100);
          return `${label}: ${value} (${percentage}%)`;
        }
      }
    }
  },
};

// Chart types are now imported from @/types

// Default colors for charts
const CHART_COLORS = {
  background: [
    'rgba(99, 102, 241, 0.8)',
    'rgba(167, 139, 250, 0.8)',
    'rgba(217, 70, 239, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(249, 115, 22, 0.8)',
  ],
  border: [
    'rgba(99, 102, 241, 1)',
    'rgba(167, 139, 250, 1)',
    'rgba(217, 70, 239, 1)',
    'rgba(236, 72, 153, 1)',
    'rgba(249, 115, 22, 1)',
  ]
};

// Process chart data from API response
const processChartData = (data: StatisticsResponse | null): ProcessedChartData | null => {
  if (!data?.charts?.pie_chart) {
    return null;
  }

  const pieData = data.charts.pie_chart;
  
  // Ensure we have valid data structure
  if (!pieData.labels || !pieData.datasets || !pieData.datasets[0]?.data) {
    console.error('Invalid chart data structure:', pieData);
    return null;
  }

  // Validate data arrays have the same length
  if (pieData.labels.length !== pieData.datasets[0].data.length) {
    console.error('Mismatch between labels and data length:', {
      labels: pieData.labels,
      data: pieData.datasets[0].data
    });
    return null;
  }

  // Get colors for the current dataset
  const backgroundColors = CHART_COLORS.background.slice(0, pieData.labels.length);
  const borderColors = CHART_COLORS.border.slice(0, pieData.labels.length);

  return {
    labels: pieData.labels,
    datasets: [{
      label: 'Question Types',
      data: pieData.datasets[0].data,
      backgroundColor: backgroundColors,
      borderColor: borderColors,
      borderWidth: 1,
    }],
  };
};

// Number of questions to show per page
const QUESTIONS_PER_PAGE = 1;

export default function StatisticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Calculate pagination when sessionData changes
  useEffect(() => {
    if (sessionData?.feedback) {
      setTotalPages(Math.ceil(sessionData.feedback.length / QUESTIONS_PER_PAGE));
      setCurrentPage(1); // Reset to first page when data changes
    }
  }, [sessionData]);
  
  // Get current questions based on pagination
  const getCurrentQuestions = () => {
    if (!sessionData?.feedback) return [];
    const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
    const endIndex = startIndex + QUESTIONS_PER_PAGE;
    return sessionData.feedback.slice(startIndex, endIndex);
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of questions section
    const questionsSection = document.getElementById('questions-section');
    if (questionsSection) {
      questionsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    console.log('Component mounted, checking for saved session...');
    
    const loadLatestSession = async () => {
      try {
        const savedSession = localStorage.getItem('interviewSession');
        console.log('Saved session from localStorage:', savedSession);
        
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
        console.error('Error in loadLatestSession:', err);
        setError('Failed to load interview session data. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadLatestSession();
    
    // Cleanup function
    return () => {
      console.log('Cleaning up statistics page...');
    };
  }, []);

  const fetchStatistics = async (id: string) => {
    console.log('Fetching statistics for session:', id);
    setIsLoading(true);
    setError(null);
    setStats(null);
    
    try {
      const req: StatisticsRequest = { session_id: id };
      console.log('Sending request to API with data:', req);
      
      // Add a timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const res = await statisticsAPI.getCharts(req);
      clearTimeout(timeoutId);
      
      console.log('Received response from API:', res);
      
      if (!res) {
        throw new Error('Empty response from server');
      }
      
      setStats(res);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. The server is taking too long to respond.');
      } else if (err instanceof APIError) {
        setError(`Error: ${err.message}`);
      } else if (err instanceof Error) {
        setError(`An error occurred: ${err.message}`);
      } else {
        setError('An unexpected error occurred while loading statistics.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  // If we have no session data but also no error, show loading state
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

  // If we have an error, show error state
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

  // If we have no stats data, show empty state
  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No statistics data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Navigation />
        <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Interview Statistics</h1>
          
          {/* Session Information */}
          {sessionData ? (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Interview Session</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Session ID:</span> {sessionData.sessionId || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Date:</span> {sessionData.timestamp ? new Date(sessionData.timestamp).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
              <p className="text-yellow-700">No session information available</p>
            </div>
          )}
          
          {/* Questions & Feedback */}
          {sessionData?.feedback && sessionData.feedback.length > 0 ? (
            <div id="questions-section" className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Interview Questions & Feedback</h2>
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
              <div className="space-y-6 mb-6">
                {getCurrentQuestions().map((item: FeedbackItem, index: number) => {
                  const originalIndex = (currentPage - 1) * QUESTIONS_PER_PAGE + index;
                  return (
                    <div key={originalIndex} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="font-medium text-gray-900 mb-2">Question {originalIndex + 1}: {item.question}</h3>
                      <p className="text-sm text-gray-700 mb-3"><span className="font-medium">Your Answer:</span> {item.answer}</p>
                      <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                        <h4 className="font-medium text-blue-800 mb-1">Feedback:</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{item.evaluation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                        currentPage === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
              <p className="text-yellow-700">No feedback available for this session</p>
            </div>
          )}
          
          {/* Charts Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Performance Metrics</h2>
            
            {/* Pie Chart - Question Types */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <PieChart className="h-5 w-5 text-indigo-600 mr-2" />
                Question Type Distribution
              </h3>
              <div className="h-80">
                {(() => {
                  const chartData = processChartData(stats);
                  console.log('Processed chart data:', chartData);
                  
                  if (!chartData) {
                    return (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        No chart data available
                      </div>
                    );
                  }
                  
                  return (
                    <div className="relative h-full w-full">
                      <Pie
                        data={chartData}
                        options={{
                          ...pieChartOptions,
                          responsive: true,
                          maintainAspectRatio: false
                        }}
                      />
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* Add more charts or metrics here as needed */}
          </div>
        </div>
      </div>
    </div>
  );
}