'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Navigation from '@/components/Navigation';
import { codeReviewAPI, APIError } from '@/lib/api';
import { Code, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function CodeReviewerPage() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ review: string; detected_language: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('codeReviewer');

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
            />
          </div>

          {/* Review Button */}
          <div className="flex justify-center mb-6">
            <button
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              onClick={handleReview}
              disabled={isLoading || !code}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  {t('form.buttons.reviewing')}
                </>
              ) : (
                t('form.buttons.review')
              )}
            </button>
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
                <span className="text-blue-800 font-mono bg-blue-50 px-2 py-0.5 rounded">
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