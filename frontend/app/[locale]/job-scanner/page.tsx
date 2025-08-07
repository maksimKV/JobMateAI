'use client';

import { useState, useEffect, Fragment } from 'react';
import { useTranslations } from 'next-intl';
import Navigation from '@/components/Navigation';
import { jobScannerAPI, cvAPI, APIError } from '@/lib/api';
import { CVData } from '@/types';
import { Search, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { SuggestionCard } from './components/SuggestionCard';
import { JobMatchRequest, JobMatchResponse } from './types';

export default function JobScannerPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingCvs, setIsLoadingCvs] = useState(true);
  const [cvList, setCvList] = useState<CVData[]>([]);
  const [selectedCv, setSelectedCv] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<JobMatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const t = useTranslations('jobScanner');

  // Set isMounted to true when component mounts on client side
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Fetch CVs when component mounts on client side
  useEffect(() => {
    if (!isMounted) return;
    
    const fetchCvs = async () => {
      try {
        const data = await cvAPI.list();
        const { cvs } = data as { cvs: CVData[]; total_cvs?: number };
        setCvList(cvs || []);
        if (cvs && cvs.length > 0) {
          setSelectedCv(cvs[0].id);
        }
      } catch (err) {
        console.error('Error fetching CVs:', err);
        setCvList([]);
        setError(t('errors.unexpected'));
      } finally {
        setIsLoadingCvs(false);
      }
    };
    
    fetchCvs();
  }, [isMounted, t]);

  const handleMatch = async () => {
    if (!isMounted) return;
    
    if (!selectedCv) {
      setError(t('errors.noCvSelected'));
      return;
    }
    
    if (!jobDescription.trim()) {
      setError(t('errors.noJobDescription'));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const req: JobMatchRequest = {
        cv_id: selectedCv,
        job_description: jobDescription,
      };
      
      const res = await jobScannerAPI.match(req);
      setResult(res);
    } catch (err) {
      console.error('Error matching job:', err);
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError(t('errors.unexpected'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded w-1/3 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
              <div className="h-64 bg-gray-100 rounded-lg mt-8"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Navigation />
      
      <main className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600">{t('description')}</p>
        </div>

        {/* CV Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{t('selectCv')}</h2>
          {cvList.length > 0 ? (
            <select
              className="w-full p-2 border rounded-md"
              value={selectedCv}
              onChange={(e) => setSelectedCv(e.target.value)}
              disabled={isLoading}
            >
              {cvList.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.filename || `CV ${cv.id}`}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-gray-500">{t('noCVs')}</p>
          )}
        </div>

        {/* Job Description */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="jobDescription" className="block text-base font-semibold text-gray-900">
              {t('jobDescription')}
            </label>
            {jobDescription && (
              <button
                type="button"
                onClick={() => setJobDescription('')}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
                title={t('clearButton')}
              >
                {t('clear')}
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              id="jobDescription"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              rows={8}
              placeholder={t('jobDescriptionPlaceholder')}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Match Button */}
        <div className="pt-2">
          <button
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            onClick={handleMatch}
            disabled={isLoading || !selectedCv || !jobDescription}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                {t('buttons.analyzing')}
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                {t('buttons.analyze')}
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Overall Match Score */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('results.title')}</h2>
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('results.overallMatch')}</h3>
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-6 rounded-full flex items-center justify-end pr-4 text-white font-medium text-sm"
                        style={{ width: `${result.match_percent}%` }}
                      >
                        {result.match_percent}%
                      </div>
                    </div>
                    <span className="ml-4 text-gray-700 font-medium">{result.match_percent}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">{t('suggestions.title')}</h2>
                
                {/* Unified Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.suggestions.map((suggestion, index) => (
                    <div key={`${suggestion.priority}-${index}`} className="h-full">
                      <SuggestionCard {...suggestion} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback to old format if no suggestions */}
            {(!result.suggestions || result.suggestions.length === 0) && (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                {/* Missing Skills */}
                {result.missing_skills && result.missing_skills.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('results.missingSkills')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills.map((skill: string, index: number) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <XCircle className="h-4 w-4 mr-1" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Skills */}
                {result.matched_skills && result.matched_skills.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('results.matchedSkills')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.matched_skills.map((skill: string, index: number) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
