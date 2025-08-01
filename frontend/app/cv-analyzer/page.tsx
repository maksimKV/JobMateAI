'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, List, Loader2 } from 'lucide-react';
import { cvAPI, APIError } from '@/lib/api';
import { CVUploadResponse, CVData } from '@/types';

export default function CVAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<CVUploadResponse | null>(null);
  const [cvList, setCvList] = useState<CVData[]>([]);
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load CV list on component mount
  useEffect(() => {
    loadCvList();
  }, []);

  const loadCvList = async () => {
    try {
      setIsLoading(true);
      const response = await cvAPI.list();
      // Type assertion to handle the API response
      const data = response as { cvs: CVData[] };
      setCvList(data.cvs || []);
    } catch (err: unknown) {
      console.error('Error loading CV list:', err);
      setError('Failed to load CV list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCvSelect = async (cvId: string) => {
    try {
      setIsLoading(true);
      const cvData = await cvAPI.getAnalysis(cvId);
      setAnalysis({
        success: true,
        cv_id: cvId,
        filename: cvData.filename || 'Unknown',
        analysis: cvData.analysis || {}
      });
      setShowList(false);
    } catch (err) {
      console.error('Error loading CV:', err);
      setError('Failed to load CV details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.type === 'application/pdf' || 
                        droppedFile.name.endsWith('.docx'))) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a valid PDF or DOCX file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await cvAPI.upload(file);
      setAnalysis(result);
      // Refresh the CV list after upload
      await loadCvList();
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

  const handleDeleteCv = async (cvId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this CV?')) return;
    
    try {
      await cvAPI.delete(cvId);
      // Refresh the CV list after deletion
      await loadCvList();
      // Clear analysis if the deleted CV is currently shown
      if (analysis?.cv_id === cvId) {
        setAnalysis(null);
      }
    } catch (err) {
      console.error('Error deleting CV:', err);
      setError('Failed to delete CV');
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CV Analyzer</h1>
          <p className="text-gray-600">Upload your CV to get detailed analysis and feedback</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">My CVs</h2>
          <button
            onClick={() => setShowList(!showList)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <List className="h-5 w-5 mr-1" />
            {showList ? 'Hide List' : 'Show My CVs'}
          </button>
        </div>

        {/* CV List */}
        {showList && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Uploaded CVs</h3>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : cvList.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No CVs found. Upload a CV to get started.</p>
            ) : (
              <div className="space-y-2">
                {cvList.map((cv) => (
                  <div 
                    key={cv.id} 
                    className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleCvSelect(cv.id)}
                  >
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-500 mr-3" />
                      <span className="font-medium">{cv.filename || 'Untitled CV'}</span>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteCv(cv.id, e)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete CV"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload New CV</h3>
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <Upload className={`h-12 w-12 mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="text-gray-600 mb-4">
                {isDragging ? 'Drop your CV here' : 'Drag and drop your CV here, or'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div>
                  <input
                    type="file"
                    id="cv-upload"
                    className="hidden"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="cv-upload"
                    className="cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block whitespace-nowrap"
                  >
                    Select File
                  </label>
                </div>
                
                {file && (
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-700 truncate max-w-xs">
                      {file.name}
                    </span>
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className={`px-6 py-2 rounded-md transition-colors whitespace-nowrap ${
                        isUploading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isUploading ? (
                        <span className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Uploading...
                        </span>
                      ) : 'Upload & Analyze'}
                    </button>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                Supported formats: PDF, DOCX (Max 10MB)
              </p>
            </div>
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
      </main>
    </div>
  );
} 