'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { codeReviewAPI, APIError } from '@/lib/api';
import { Code, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function CodeReviewerPage() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ review: string; detected_language: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReview = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await codeReviewAPI.review(code);
      setResult({ review: res.review, detected_language: res.detected_language });
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
            <Code className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Code Reviewer</h1>
            <p className="text-gray-600">
              Paste your code and get AI-powered feedback, bug detection, and optimization tips.
            </p>
          </div>

          {/* Code Input */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Paste Your Code</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 min-h-[180px] font-mono"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Paste your code here..."
            />
          </div>

          {/* Review Button */}
          <div className="mb-6 text-center">
            <button
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleReview}
              disabled={isLoading || !code}
            >
              {isLoading ? (
                <span className="flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5 mr-2" />Reviewing...</span>
              ) : (
                'Review Code'
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

          {/* Result */}
          {result && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Detected Language:</span>
                <span className="text-blue-800 font-mono">{result.detected_language}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-gray-800">
                {result.review}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}