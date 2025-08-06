'use client';

import { useState, useEffect, Fragment } from 'react';
import Navigation from '@/components/Navigation';
import { jobScannerAPI, cvAPI, APIError } from '@/lib/api';
import { CVData } from '@/types';
import { Search, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { SuggestionCard } from './components/SuggestionCard';
import { JobMatchRequest, JobMatchResponse, Suggestion } from './types';

export default function JobScannerPage() {
  const [cvList, setCvList] = useState<CVData[]>([]);
  const [selectedCv, setSelectedCv] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<JobMatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cvAPI.list().then((data) => {
      const { cvs } = data as { cvs: CVData[]; total_cvs?: number };
      setCvList(cvs || []);
      if (cvs && cvs.length > 0) {
        setSelectedCv(cvs[0].id);
      }
    });
  }, []);

  const handleMatch = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const req: JobMatchRequest = {
        cv_id: selectedCv,
        job_description: jobDescription,
      };
      const res: JobMatchResponse = await jobScannerAPI.match(req);
      setResult(res);
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
            <Search className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Job Scanner</h1>
          </div>
          <p className="text-gray-600">Paste a job description and see how your skills match up.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="space-y-6">
            {/* Select CV */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Select your CV</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={selectedCv}
                onChange={(e) => setSelectedCv(e.target.value)}
                disabled={isLoading}
              >
                {cvList.length === 0 && <option value="">No CVs uploaded</option>}
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
                  Job Description
                </label>
                {jobDescription && (
                  <button
                    type="button"
                    onClick={() => setJobDescription('')}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                    title="Clear job description"
                  >
                    Clear
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
                  placeholder="Paste the job description here..."
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
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Analyze Job Match
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis Results</h2>
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Overall Match</h3>
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
                <h2 className="text-xl font-semibold text-gray-900">AI Suggestions</h2>
                
                {/* Unified Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.suggestions?.map((suggestion: Suggestion, index: number) => (
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Missing Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills.map((skill, index) => (
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Your Matching Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.matched_skills.map((skill, index) => (
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