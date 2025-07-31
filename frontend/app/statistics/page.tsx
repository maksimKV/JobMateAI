'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { statisticsAPI, APIError } from '@/lib/api';
import { StatisticsRequest, StatisticsResponse } from '@/types';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend } from 'chart.js';
import { BarChart3, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

Chart.register(BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend);

export default function StatisticsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

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

          {/* Session Info */}
          {sessionId && (
            <div className="mb-6">
              <div className="flex items-center justify-between">
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

          {/* Charts */}
          {stats && !isLoading && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">HR vs Technical Performance</h2>
                <Bar data={stats.bar_chart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Theory vs Practical (Technical)</h2>
                <Pie data={stats.pie_chart} options={{ responsive: true }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}