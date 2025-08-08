'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Navigation from '@/components/Navigation';
import { jobScannerAPI, cvAPI, APIError } from '@/lib/api';
import { CVData } from '@/types';
import { Search, Loader2, AlertCircle, CheckCircle, XCircle, SearchCheck } from 'lucide-react';
import { SuggestionCard } from './components/SuggestionCard';
import { 
  JobMatchRequest, 
  JobMatchResponse, 
  isSuggestionsArray
} from './types';

export default function JobScannerPage() {
  const [cvList, setCvList] = useState<CVData[]>([]);
  const [selectedCv, setSelectedCv] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<JobMatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('jobScanner');

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      cvAPI.list().then((data) => {
        const { cvs } = data as { cvs: CVData[]; total_cvs?: number };
        setCvList(cvs || []);
        if (cvs && cvs.length > 0) {
          setSelectedCv(cvs[0].id);
        }
      }).catch((err) => {
        console.error('Error fetching CV list:', err);
        setError(t('errors.unexpected'));
      });
    }
  }, [t]);

  const handleMatch = async () => {
    // Validate inputs
    if (!selectedCv) {
      setError(t('errors.selectCV'));
      return;
    }
    
    if (!jobDescription.trim()) {
      setError(t('errors.enterJobDescription'));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log('Starting job match with CV ID:', selectedCv);
      console.log('Job description length:', jobDescription.length, 'characters');
      
      // Prepare the request with proper structure
      const req: JobMatchRequest = {
        cv_id: selectedCv,
        job_description: {
          raw_text: jobDescription,
          // Add any additional structured data here if needed
        },
        language: 'en' // Default to English, can be made dynamic based on user selection
      };
      
      console.log('Sending request to API:', JSON.stringify(req, null, 2));
      
      const startTime = Date.now();
      const res: JobMatchResponse = await jobScannerAPI.match(req);
      const endTime = Date.now();
      
      console.log(`API response received in ${endTime - startTime}ms`, res);
      
      if (res.success) {
        setResult(res);
        console.log('Match score:', res.match_score);
        console.log('Extracted job skills:', res.job_skills);
        console.log('CV skills:', res.cv_skills);
      } else {
        console.error('API returned success:false with message:', res.message);
        setError(res.message || t('errors.matchFailed'));
      }
    } catch (err) {
      console.error('Error in handleMatch:', err);
      
      if (err instanceof APIError) {
        console.error('API Error:', err.status, err.message);
        setError(`${t('errors.apiError')}: ${err.message}`);
      } else if (err instanceof Error) {
        console.error('Unexpected error:', err.message, err.stack);
        setError(`${t('errors.unexpected')}: ${err.message}`);
      } else {
        console.error('Unknown error occurred');
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
            <Search className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          </div>
          <p className="text-gray-600">{t('description')}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="space-y-6">
            {/* Select CV */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">{t('selectCv')}</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={selectedCv}
                onChange={(e) => setSelectedCv(e.target.value)}
                disabled={isLoading}
              >
                {cvList.length === 0 && <option value="">{t('noCVs')}</option>}
                {cvList.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.filename}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="jobDescription" className="block text-base font-semibold text-gray-900 mb-2">
                {t('jobDescription')}
              </label>
              <textarea
                id="jobDescription"
                className="w-full border rounded-lg px-4 py-3 min-h-[200px]"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder={t('jobDescriptionPlaceholder')}
                disabled={isLoading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center">
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-1 sm:flex-none"
                  onClick={handleMatch}
                  disabled={isLoading || !selectedCv || !jobDescription.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      {t('analyzing')}
                    </>
                  ) : (
                    <>
                      <SearchCheck className="h-5 w-5 mr-2" />
                      {t('buttons.analyze')}
                    </>
                  )}
                </button>
                
                {jobDescription.trim() && (
                  <button
                    type="button"
                    className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-1 sm:flex-none transition-colors"
                    onClick={() => {
                      setJobDescription('');
                      setResult(null);
                      setError(null);
                    }}
                    disabled={isLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {t('clear')}
                  </button>
                )}
              </div>
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
          </div>
        </div>

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
                        style={{ width: `${result.match_score}%` }}
                      >
                        {result.match_score}%
                      </div>
                    </div>
                    <span className="ml-4 text-gray-700 font-medium">{result.match_score}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Missing and Matched Skills */}
            <div className="space-y-6">
              {/* Missing Skills */}
              {result.missing_skills && result.missing_skills.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    <XCircle className="h-5 w-5 text-red-500 inline-block mr-2" />
                    {t('results.missingSkills')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.missing_skills.map((skill, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        {typeof skill === 'string' ? skill : skill.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Skills */}
              {result.matched_skills && result.matched_skills.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    <CheckCircle className="h-5 w-5 text-green-500 inline-block mr-2" />
                    {t('results.matchedSkills')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.matched_skills.map((skill, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {typeof skill === 'string' ? skill : skill.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Suggestions */}
            {result.suggestions && isSuggestionsArray(result.suggestions) && result.suggestions.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">{t('suggestions.title')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.suggestions.map((suggestion, index) => (
                    <div key={`${suggestion.id || index}`} className="h-full">
                      <SuggestionCard 
                        id={suggestion.id || `suggestion-${index}`}
                        title={suggestion.title}
                        description={suggestion.description}
                        items={suggestion.items}
                        priority={suggestion.priority}
                        icon={suggestion.icon}
                        category={suggestion.category}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}