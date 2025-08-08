'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Navigation from '@/components/Navigation';
import { codeReviewAPI, APIError } from '@/lib/api';
import { CodeReviewResponse } from '@/types';
import { Code, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function CodeReviewerPage() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CodeReviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('codeReviewer');

  const handleReview = async () => {
    if (!code.trim()) {
      setError(t('errors.emptyCode'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const res = await codeReviewAPI.review(code);
      
      // Handle the response
      setResult({
        success: res.success,
        review: res.review,
        detected_language: res.detected_language
      });
      
    } catch (err) {
      console.error('Error during code review:', err);
      if (err instanceof APIError) {
        setError(err.message || t('errors.default'));
      } else {
        setError(t('errors.unexpected'));
      }
    } finally {
      setIsLoading(false);
    }
  };
  


  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <Code className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          </div>
          <p className="text-gray-600">{t('description')}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {/* Code Input */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              {t('form.codeInput.label')}
            </label>
            <textarea
              className="w-full border rounded-lg px-4 py-3 min-h-[200px] font-mono text-sm"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={t('form.codeInput.placeholder')}
              disabled={isLoading}
              spellCheck="false"
              style={{ tabSize: 2 }}
            />
          </div>

          {/* Review Button */}
          <div className="flex justify-center mb-6">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-1 sm:flex-none"
                onClick={handleReview}
                disabled={isLoading || !code.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    {t('form.buttons.reviewing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    {t('form.buttons.review')}
                  </>
                )}
              </button>
              
              {code.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setCode('');
                    setResult(null);
                    setError(null);
                  }}
                  className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-1 sm:flex-none transition-colors"
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {t('form.buttons.clear')}
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                  {error === 'An unexpected error occurred' ? t('errors.unexpected') : error}
                </p>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2 text-gray-700 mb-4">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{t('result.detectedLanguage')}:</span>
                <span className="text-blue-800 font-mono bg-blue-50 px-2 py-0.5 rounded text-sm">
                  {result.detected_language}
                </span>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 whitespace-pre-wrap text-gray-800 text-sm font-mono">
                {result.review}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}