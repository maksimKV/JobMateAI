'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Navigation from '@/components/Navigation';
import { coverLetterAPI, cvAPI } from '@/lib/api';
import { CoverLetterRequest, CVData } from '@/types';
import { Mail, Loader2, AlertCircle, Download } from 'lucide-react';
import { generateCoverLetterPdf } from '@/lib/pdf/coverLetterPdf';

export default function CoverLetterPage() {
  const [cvList, setCvList] = useState<CVData[]>([]);
  const [selectedCv, setSelectedCv] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [language, setLanguage] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coverLetterRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('coverLetter');

  useEffect(() => {
    // Fetch available CVs
    cvAPI.list().then((data) => {
      const { cvs } = data as { cvs: CVData[]; total_cvs: number };
      setCvList(cvs || []);
      if (cvs && cvs.length > 0) {
        setSelectedCv(cvs[0].id);
      }
    });
  }, []);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setCoverLetter(null);
    setCompanyName(null);
    try {
      const req: CoverLetterRequest = {
        cv_id: selectedCv,
        job_description: jobDescription,
        language,
      };
      const data = await coverLetterAPI.generate(req);
      setCoverLetter(data.cover_letter);
      setCompanyName(data.company_name || t('defaultCompanyName'));
    } catch (err) {
      console.error('Error generating cover letter:', err);
      setError(err instanceof Error ? err.message : t('errors.generationFailed'));
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
            <Mail className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          </div>
          <p className="text-gray-600">{t('description')}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="space-y-6">
            {/* Select CV */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">{t('form.selectCV')}</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={selectedCv}
                onChange={(e) => setSelectedCv(e.target.value)}
                disabled={isLoading}
              >
                {cvList.length === 0 && <option value="">{t('form.noCVs')}</option>}
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
                  {t('form.jobDescription')}
                </label>
                {jobDescription && (
                  <button
                    type="button"
                    onClick={() => setJobDescription('')}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                    title={t('form.clearButton')}
                  >
                    {t('form.clear')}
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
                  placeholder={t('form.jobDescriptionPlaceholder')}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">{t('form.language')}</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isLoading}
              >
                <option value="English">{t('form.languages.english')}</option>
                <option value="Bulgarian">{t('form.languages.bulgarian')}</option>
              </select>
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              <button
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGenerate}
                disabled={isLoading || !selectedCv || !jobDescription}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    {t('form.buttons.generating')}
                  </span>
                ) : (
                  t('form.buttons.generate')
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

        {/* Result */}
        {coverLetter && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{t('result.title')}</h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(coverLetter);
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                title={t('result.copyTooltip')}
              >
                {t('result.copyButton')}
              </button>
            </div>
            <div 
              ref={coverLetterRef}
              id="cover-letter-content"
              className="bg-white border border-gray-300 rounded-lg p-4 text-gray-800 w-full min-h-[200px] max-h-[600px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              contentEditable
              suppressContentEditableWarning={true}
              onInput={(e) => setCoverLetter(e.currentTarget.textContent || '')}
              dangerouslySetInnerHTML={{ __html: coverLetter.replace(/\n/g, '<br>') }}
              style={{ 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: '1.6',
                fontFamily: 'inherit',
                fontSize: '0.9375rem'
              }}
            />
            <div className="mt-4 flex justify-center">
              <button
                onClick={async () => {
                  if (!coverLetterRef.current || !companyName) return;
                  
                  setIsGeneratingPdf(true);
                  setError(null);
                  
                  try {
                    await generateCoverLetterPdf({
                      element: coverLetterRef.current,
                      companyName,
                      onError: (error) => {
                        console.error('Error generating PDF:', error);
                        setError(t('errors.pdfGenerationFailed'));
                      },
                      onSuccess: () => {
                        // Optional: Add any success handling here
                      },
                    });
                  } catch (error) {
                    console.error('Error generating PDF:', error);
                    setError(t('errors.pdfGenerationFailed'));
                  } finally {
                    setIsGeneratingPdf(false);
                  }
                }}
                disabled={isGeneratingPdf}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('result.generatingPdf')}
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    {t('result.downloadPdf')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}