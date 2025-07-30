'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { statisticsAPI, APIError } from '@/lib/api';
import { StatisticsRequest, StatisticsResponse } from '@/types';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend } from 'chart.js';
import { BarChart3, Loader2, AlertCircle } from 'lucide-react';

Chart.register(BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend);

export default function StatisticsPage() {
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setIsLoading(true);
    setError(null);
    setStats(null);
    try {
      const req: StatisticsRequest = { session_id: sessionId };
      const res = await statisticsAPI.getCharts(req);
      setStats(res);
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('An unexpected error occurred');
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

          {/* Session ID Input */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Enter Interview Session ID</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              placeholder="Session ID..."
            />
          </div>

          {/* Fetch Button */}
          <div className="mb-6 text-center">
            <button
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleFetch}
              disabled={isLoading || !sessionId}
            >
              {isLoading ? (
                <span className="flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5 mr-2" />Fetching...</span>
              ) : (
                'Show Statistics'
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Charts */}
          {stats && (
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