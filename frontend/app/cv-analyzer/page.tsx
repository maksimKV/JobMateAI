'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cvAPI, APIError } from '@/lib/api';
import { CVUploadResponse } from '@/types';

export default function CVAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analysis, setAnalysis] = useState<CVUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await cvAPI.upload(file);
      setAnalysis(result);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const getSectionStatus = (hasSection: boolean) => {
    return hasSection ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Navigation />
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">CV Analyzer</h1>
            <p className="text-gray-600">
              Upload your resume and get AI-powered analysis of structure, clarity, and missing sections.
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-8">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="mb-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-semibold">
                    Choose a file
                  </span>
                  <span className="text-gray-500"> or drag and drop</span>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-gray-500">
                PDF or DOCX files up to 10MB
              </p>
              {file && (
                <p className="text-sm text-green-600 mt-2">
                  Selected: {file.name}
                </p>
              )}
            </div>
            
            {file && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Analyzing...' : 'Analyze CV'}
                </button>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Analysis Results</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">File Information</h3>
                    <p className="text-sm text-gray-600">Filename: {analysis.filename}</p>
                    <p className="text-sm text-gray-600">Word Count: {analysis.analysis.word_count}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Skills Found</h3>
                    <p className="text-sm text-gray-600">
                      {analysis.analysis.extracted_skills.length} skills detected
                    </p>
                  </div>
                </div>
              </div>

              {/* Structure Analysis */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Structure Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Contact Information</span>
                      {getSectionStatus(analysis.analysis.structure.has_contact_info)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Education</span>
                      {getSectionStatus(analysis.analysis.structure.has_education)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Work Experience</span>
                      {getSectionStatus(analysis.analysis.structure.has_experience)}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Skills Section</span>
                      {getSectionStatus(analysis.analysis.structure.has_skills)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Projects</span>
                      {getSectionStatus(analysis.analysis.structure.has_projects)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Certifications</span>
                      {getSectionStatus(analysis.analysis.structure.has_certifications)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Missing Sections */}
              {analysis.analysis.missing_sections.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Missing Sections</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.analysis.missing_sections.map((section, index) => (
                        <li key={index} className="text-yellow-800">{section}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Skills */}
              {analysis.analysis.extracted_skills.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Detected Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.analysis.extracted_skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Feedback */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Feedback</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {analysis.analysis.ai_feedback}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 