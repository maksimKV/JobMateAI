'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Navigation from '@/components/Navigation';
import { codeReviewAPI, APIError } from '@/lib/api';
import { Code, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function CodeReviewerPage() {
  const t = useTranslations('codeReviewer');
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
      else setError(t('errors.unexpected'));
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
              {t('pasteCode')}
            </label>
            <textarea
              className="w-full border rounded-lg px-4 py-3 min-h-[200px] font-mono text-sm"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={t('pastePlaceholder')}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleReview}
              disabled={!code.trim() || isLoading}
              className={`inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${!code.trim() || isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  {t('buttons.reviewing')}
                </>
              ) : (
                <>
                  <Sparkles className="-ml-1 mr-2 h-5 w-5" />
                  {t('buttons.review')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-2 text-gray-600">{t('analyzing')}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {t('results.title')} ({result.detected_language || 'Unknown'})
            </h2>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {result.review}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
