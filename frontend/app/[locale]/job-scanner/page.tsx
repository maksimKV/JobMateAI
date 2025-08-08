'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Navigation from '@/components/Navigation';
import { jobScannerAPI, cvAPI, APIError } from '@/lib/api';
import { CVData } from '@/types';
import { Search, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { SuggestionCard } from './components/SuggestionCard';
import { 
  JobMatchRequest, 
  JobMatchResponse, 
  Suggestion, 
  SkillType, 
  isSuggestionsArray, 
  isSuggestionsObject, 
  isMissingSkill 
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
                title={!selectedCv ? t('errors.noCvSelected') : !jobDescription ? t('errors.noJobDescription') : ''}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    {t('analyzing')}
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

            {/* AI Suggestions */}
            {result.suggestions && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">{t('suggestions.title')}</h2>
                
                {isSuggestionsArray(result.suggestions) ? (
                  result.suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.suggestions.map((suggestion, index) => (
                        <div key={`${suggestion.priority}-${index}`} className="flex">
                          <SuggestionCard {...suggestion} />
                        </div>
                      ))}
                    </div>
                  ) : null
                ) : isSuggestionsObject(result.suggestions) && result.suggestions.missing_skills?.length ? (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('results.missingSkills')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.suggestions.missing_skills.map((skill, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <XCircle className="h-4 w-4 mr-1" />
                          {isMissingSkill(skill) ? skill.text : skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Fallback to old format if no suggestions */}
            {(!result.suggestions || 
              (isSuggestionsObject(result.suggestions) && !result.suggestions.missing_skills?.length) ||
              (isSuggestionsArray(result.suggestions) && result.suggestions.length === 0)
            ) && (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                {/* Missing Skills */}
                {result.missing_skills && result.missing_skills.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('results.missingSkills')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills.map((skill, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <XCircle className="h-4 w-4 mr-1" />
                          {isMissingSkill(skill) ? skill.text : skill}
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
                      {result.matched_skills.map((skill, index) => {
                        const skillText = typeof skill === 'string' ? skill : skill.text;
                        return (
                          <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {skillText}
                          </span>
                        );
                      })}
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