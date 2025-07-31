'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { jobScannerAPI, cvAPI, APIError } from '@/lib/api';
import { JobMatchRequest, JobMatchResponse, CVData } from '@/types';
import { Search, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Navigation />
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <Search className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Scanner</h1>
            <p className="text-gray-600">
              Paste a job description and see how your skills match up.
            </p>
          </div>

          {/* Select CV */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Select your CV</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={selectedCv}
              onChange={(e) => setSelectedCv(e.target.value)}
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
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700">
                Job Description
              </label>
              {jobDescription && (
                <button
                  type="button"
                  onClick={() => setJobDescription('')}
                  className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none"
                  disabled={isLoading}
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
          <div className="mb-6 text-center">
            <button
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleMatch}
              disabled={isLoading || !selectedCv || !jobDescription}
            >
              {isLoading ? (
                <span className="flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5 mr-2" />Analyzing...</span>
              ) : (
                'Analyze Match'
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
            <div className="mt-8 space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Skill Match</h2>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-lg font-bold text-purple-700">{result.match_percent}%</span>
                  <span className="text-gray-700">Matched Skills</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {result.matched_skills.map((skill, idx) => (
                    <span key={idx} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-purple-600" /> {skill}
                    </span>
                  ))}
                  {result.matched_skills.length === 0 && <span className="text-gray-500">No matched skills</span>}
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-lg font-bold text-red-700">{result.missing_skills.length}</span>
                  <span className="text-gray-700">Missing Skills</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {result.missing_skills.map((skill, idx) => (
                    <span key={idx} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center">
                      <XCircle className="h-4 w-4 mr-1 text-red-600" /> {skill}
                    </span>
                  ))}
                  {result.missing_skills.length === 0 && <span className="text-gray-500">No missing skills</span>}
                </div>
              </div>

              {/* Soft Skills */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Soft Skills Match</h2>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-lg font-bold text-purple-700">{result.soft_skill_percent}%</span>
                  <span className="text-gray-700">Matched Soft Skills</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {result.matched_soft_skills.map((skill, idx) => (
                    <span key={idx} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-purple-600" /> {skill}
                    </span>
                  ))}
                  {result.matched_soft_skills.length === 0 && <span className="text-gray-500">No matched soft skills</span>}
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-lg font-bold text-red-700">{result.missing_soft_skills.length}</span>
                  <span className="text-gray-700">Missing Soft Skills</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {result.missing_soft_skills.map((skill, idx) => (
                    <span key={idx} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center">
                      <XCircle className="h-4 w-4 mr-1 text-red-600" /> {skill}
                    </span>
                  ))}
                  {result.missing_soft_skills.length === 0 && <span className="text-gray-500">No missing soft skills</span>}
                </div>
              </div>

              {/* Job Info */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Extracted Job Info</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(result.job_info, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}