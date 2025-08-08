'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('cvAnalyzer');

  // Load the last viewed CV ID from localStorage
  const getLastViewedCvId = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('lastViewedCvId');
  };

  // Save the last viewed CV ID to localStorage
  const saveLastViewedCvId = (cvId: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('lastViewedCvId', cvId);
  };

  const handleCvSelect = useCallback(async (cvId: string) => {
    try {
      setIsLoading(true);
      const cvData = await cvAPI.getAnalysis(cvId);
      
      // Create a complete CVUploadResponse object with all required properties
      const response: CVUploadResponse = {
        success: true,
        cv_id: cvId,
        filename: cvData.filename || 'Unknown',
        upload_timestamp: cvData.upload_timestamp || new Date().toISOString(),
        parsed_data: cvData.parsed_data || null,
        extracted_skills: Array.isArray(cvData.analysis?.extracted_skills) 
          ? cvData.analysis.extracted_skills 
          : (Array.isArray(cvData.extracted_skills) ? cvData.extracted_skills : []),
        analysis: {
          structure: {
            has_contact_info: cvData.analysis?.structure?.has_contact_info || 
                            cvData.parsed_data?.sections?.has_contact_info || false,
            has_education: cvData.analysis?.structure?.has_education || 
                         cvData.parsed_data?.sections?.has_education || false,
            has_experience: cvData.analysis?.structure?.has_experience || 
                          cvData.parsed_data?.sections?.has_experience || false,
            has_skills: cvData.analysis?.structure?.has_skills || 
                       cvData.parsed_data?.sections?.has_skills || false,
            has_projects: cvData.analysis?.structure?.has_projects || 
                         cvData.parsed_data?.sections?.has_projects || false,
            has_certifications: cvData.analysis?.structure?.has_certifications || 
                              cvData.parsed_data?.sections?.has_certifications || false,
            missing_sections: cvData.analysis?.structure?.missing_sections || 
                            cvData.parsed_data?.sections?.missing_sections || []
          },
          ai_feedback: cvData.analysis?.ai_feedback || cvData.analysis?.analysis || '',
          extracted_skills: Array.isArray(cvData.analysis?.extracted_skills) 
            ? cvData.analysis.extracted_skills 
            : (Array.isArray(cvData.extracted_skills) ? cvData.extracted_skills : []),
          word_count: cvData.analysis?.word_count || cvData.parsed_data?.word_count || 0,
          missing_sections: cvData.analysis?.missing_sections || 
                          cvData.parsed_data?.sections?.missing_sections || []
        },
      };
      
      setAnalysis(response);
      saveLastViewedCvId(cvId);
    } catch (err) {
      console.error('Error loading CV analysis:', err);
      setError(t('errors.loadAnalysis'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const loadCvList = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await cvAPI.list();
      const cvs = Array.isArray(response) ? response : (response as { cvs: CVData[] })?.cvs || [];
      setCvList(cvs);
      
      // If no analysis is loaded yet, try to load the last viewed CV
      if (!analysis && cvs.length > 0) {
        const lastViewedCvId = getLastViewedCvId();
        const cvToLoad = lastViewedCvId 
          ? cvs.find(cv => cv.id === lastViewedCvId) || cvs[0]
          : cvs[0];
          
        if (cvToLoad) {
          await handleCvSelect(cvToLoad.id);
        }
      }
    } catch (err) {
      console.error('Error loading CV list:', err);
      setError(t('errors.loadList'));
      setCvList([]);
    } finally {
      setIsLoading(false);
    }
  }, [t, analysis, handleCvSelect]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadCvList();
  }, [loadCvList]);

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
      setError(t('errors.invalidFile'));
    }
  };

  // Clear the last viewed CV when uploading a new one
  const handleUpload = async () => {
    if (!file) {
      setError(t('errors.noFileSelected'));
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await cvAPI.upload(file);
      setAnalysis({
        ...result,
        cv_id: result.cv_id,
        filename: result.filename || file.name,
        analysis: {
          structure: {
            has_contact_info: result.analysis?.structure?.has_contact_info || false,
            has_education: result.analysis?.structure?.has_education || false,
            has_experience: result.analysis?.structure?.has_experience || false,
            has_skills: result.analysis?.structure?.has_skills || false,
            has_projects: result.analysis?.structure?.has_projects || false,
            has_certifications: result.analysis?.structure?.has_certifications || false,
            missing_sections: result.analysis?.structure?.missing_sections || []
          },
          ai_feedback: result.analysis?.ai_feedback || result.analysis?.analysis || '',
          extracted_skills: Array.isArray(result.analysis?.extracted_skills) ? 
            result.analysis.extracted_skills : 
            (Array.isArray(result.extracted_skills) ? result.extracted_skills : []),
          word_count: result.analysis?.word_count || 0,
          missing_sections: result.analysis?.missing_sections || []
        },
        parsed_data: result.parsed_data || {
          raw_text: '',
          sections: {
            has_contact_info: false,
            has_education: false,
            has_experience: false,
            has_skills: false,
            has_projects: false,
            has_certifications: false,
            missing_sections: []
          },
          file_path: '',
          file_type: file.type || file.name.split('.').pop() || '',
          word_count: 0,
          character_count: 0
        },
        extracted_skills: Array.isArray(result.extracted_skills) ? result.extracted_skills : []
      });
      await loadCvList();
    } catch (err) {
      console.error('Upload error:', err);
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError(t('errors.uploadFailed'));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCv = async (cvId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('confirmDelete'))) return;
    
    try {
      await cvAPI.delete(cvId);
      await loadCvList();
      if (analysis?.cv_id === cvId) {
        setAnalysis(null);
      }
    } catch (err) {
      console.error('Error deleting CV:', err);
      setError(t('errors.deleteFailed'));
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
          <div className="flex items-center justify-center mb-2">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          </div>
          <p className="text-gray-600">{t('description')}</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{t('myCVs')}</h2>
          <button
            onClick={() => setShowList(!showList)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <List className="h-5 w-5 mr-1" />
            {showList ? t('buttons.hideList') : t('buttons.showList')}
          </button>
        </div>

        {showList && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('uploadedCVs')}</h3>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : cvList.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t('noCVs')}</p>
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
                      <span className="font-medium">{cv.filename || t('defaults.untitled')}</span>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteCv(cv.id, e)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title={t('buttons.delete')}
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('upload.title')}</h3>
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
                {isDragging ? t('upload.dragActive') : t('upload.dragInactive')}
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
                    {t('upload.selectFile')}
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
                          {t('upload.uploading')}
                        </span>
                      ) : t('upload.uploadButton')}
                    </button>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                {t('upload.supportedFormats')}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {analysis && (
            <div className="mt-8 space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('analysis.title')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{t('analysis.fileInfo')}</h3>
                    <p className="text-sm text-gray-600">{t('analysis.filename')}: {analysis.filename}</p>
                    <p className="text-sm text-gray-600">{t('analysis.wordCount')}: {analysis.parsed_data?.word_count || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{t('analysis.skillsFound')}</h3>
                    <p className="text-sm text-gray-600">
                      {analysis.extracted_skills?.length || 0} {t('analysis.skillsDetected')}
                    </p>
                  </div>
                </div>
              </div>

              {analysis.analysis?.structure && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('analysis.structure.title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">{t('analysis.structure.contactInfo')}</span>
                        {getSectionStatus(analysis.analysis?.structure?.has_contact_info || 
                                       analysis.parsed_data?.sections?.has_contact_info || false)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">{t('analysis.structure.education')}</span>
                        {getSectionStatus(analysis.analysis?.structure?.has_education || 
                                       analysis.parsed_data?.sections?.has_education || false)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">{t('analysis.structure.experience')}</span>
                        {getSectionStatus(analysis.analysis?.structure?.has_experience || 
                                       analysis.parsed_data?.sections?.has_experience || false)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">{t('analysis.structure.skills')}</span>
                        {getSectionStatus(analysis.analysis?.structure?.has_skills || 
                                       analysis.parsed_data?.sections?.has_skills || false)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">{t('analysis.structure.projects')}</span>
                        {getSectionStatus(analysis.analysis?.structure?.has_projects || 
                                       analysis.parsed_data?.sections?.has_projects || false)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">{t('analysis.structure.certifications')}</span>
                        {getSectionStatus(analysis.analysis?.structure?.has_certifications || 
                                       analysis.parsed_data?.sections?.has_certifications || false)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {analysis.analysis?.missing_sections?.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('analysis.missingSections')}</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.analysis.missing_sections.map((section, index) => (
                        <li key={index} className="text-yellow-800">{section}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {(analysis.analysis?.extracted_skills?.length > 0 || analysis.extracted_skills?.length > 0) && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('analysis.detectedSkills')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.analysis.extracted_skills || analysis.extracted_skills || []).map((skill, index) => (
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

              {analysis.analysis?.ai_feedback && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('analysis.aiFeedback')}</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {analysis.analysis.ai_feedback}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}