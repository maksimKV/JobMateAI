'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { statisticsAPI, APIError } from '@/lib/api';
import { StatisticsRequest, StatisticsResponse } from '@/types';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { BarChart3, Loader2, AlertCircle, ArrowLeft, MessageSquare, CheckCircle } from 'lucide-react';

// Register Chart.js components
Chart.register(BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend, Title);

export default function StatisticsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'charts'>('summary');

  useEffect(() => {
    const loadLatestSession = async () => {
      try {
        const savedSession = localStorage.getItem('interviewSession');
        if (savedSession) {
          const session = JSON.parse(savedSession);
          if (session.sessionId) {
            setSessionId(session.sessionId);
            await fetchStatistics(session.sessionId);
            return;
          }
        }
        setError('No interview session found. Please complete an interview first.');
      } catch (err) {
        console.error('Error loading session:', err);
        setError('Failed to load interview session data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadLatestSession();
  }, []);

  const fetchStatistics = async (id: string) => {
    setIsLoading(true);
    setError(null);
    setStats(null);
    try {
      const req: StatisticsRequest = { session_id: id };
      const res = await statisticsAPI.getCharts(req);
      setStats(res);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while loading statistics.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Navigation />
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <BarChart3 className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Statistics Dashboard</h1>
            <p className="text-gray-600">
              Visualize your interview performance with interactive charts.
            </p>
          </div>

          {/* Session Info and Tabs */}
          {sessionId && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Session ID</p>
                  <p className="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded mt-1">{sessionId}</p>
                </div>
                <button
                  onClick={() => router.back()}
                  className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors text-sm font-medium"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Interview
                </button>
              </div>
              
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`${activeTab === 'summary' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Interview Summary
                  </button>
                  <button
                    onClick={() => setActiveTab('charts')}
                    className={`${activeTab === 'charts' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Performance Charts
                  </button>
                </nav>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !stats && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-gray-600">Loading your interview statistics...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-700 font-medium">{error}</p>
                  <p className="text-sm text-red-600 mt-1">
                    {error.includes('No interview session') ? (
                      'Please complete an interview first to see your statistics.'
                    ) : (
                      'Please try again later or contact support if the issue persists.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Content based on active tab */}
          {stats && !isLoading && (
            <div className="mt-6">
              {activeTab === 'summary' ? (
                <div className="space-y-8">
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-medium text-gray-900">Interview Summary</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {stats.session?.timestamp ? (
                          <>
                            {new Date(stats.session.timestamp).toLocaleString()}
                            {' • '}
                          </>
                        ) : null}
                        <span className="capitalize">{stats.session?.interviewType || 'Unknown'}</span> Interview
                      </p>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {stats.session?.questions?.length ? (
                        stats.session.questions.map((question, index) => {
                        const feedback = stats.session?.feedback?.[index];
                        return (
                          <div key={index} className="p-6">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <MessageSquare className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="ml-4 flex-1">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-medium text-gray-900">
                                    Question {index + 1}
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {question.type}
                                    </span>
                                  </h3>
                                </div>
                                <div className="mt-1 text-sm text-gray-700 space-y-2">
                                  <p className="font-medium">{question.text}</p>
                                  
                                  {feedback?.answer && (
                                    <div className="mt-2">
                                      <p className="text-sm font-medium text-gray-500">Your Answer:</p>
                                      <p className="mt-1 px-3 py-2 bg-gray-50 rounded-md">
                                        {feedback.answer}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {feedback?.evaluation && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-100">
                                      <div className="flex">
                                        <CheckCircle className="flex-shrink-0 h-5 w-5 text-blue-500" />
                                        <div className="ml-3">
                                          <h4 className="text-sm font-medium text-blue-800">AI Feedback</h4>
                                          <div className="mt-1 text-sm text-blue-700 whitespace-pre-wrap">
                                            {feedback.evaluation}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })) : (
                        <div className="p-6 text-center text-gray-500">
                          No interview questions found in this session.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">HR vs Technical Performance</h2>
                    <div className="h-80">
                      <Bar 
                        data={stats.bar_chart} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            title: {
                              display: true,
                              text: 'Performance by Question Type',
                              font: { size: 16 }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                              title: {
                                display: true,
                                text: 'Score (%)'
                              }
                            }
                          }
                        }} 
                      />
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Theory vs Practical (Technical)</h2>
                    <div className="h-80 flex justify-center">
                      <div className="w-full max-w-md">
                        <Pie 
                          data={stats.pie_chart} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'right',
                              },
                              title: {
                                display: true,
                                text: 'Question Type Distribution',
                                font: { size: 16 }
                              }
                            }
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}