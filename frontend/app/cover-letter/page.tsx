'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { coverLetterAPI, cvAPI, APIError } from '@/lib/api';
import { CoverLetterRequest, CoverLetterResponse, CVData } from '@/types';
import { Mail, Loader2, AlertCircle, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Type definition for html2canvas options
type Html2CanvasOptions = {
  scale?: number;
  logging?: boolean;
  useCORS?: boolean;
  allowTaint?: boolean;
  backgroundColor?: string | null;
  removeContainer?: boolean;
};

export default function CoverLetterPage() {
  const [cvList, setCvList] = useState<CVData[]>([]);
  const [selectedCv, setSelectedCv] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [language, setLanguage] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const req: CoverLetterRequest = {
        cv_id: selectedCv,
        job_description: jobDescription,
        language,
      };
      const res: CoverLetterResponse = await coverLetterAPI.generate(req);
      setCoverLetter(res.cover_letter);
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
            <Mail className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Cover Letter Generator</h1>
            <p className="text-gray-600">
              Generate a personalized cover letter based on your CV and a job description.
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

          {/* Language Selection */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Language</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Bulgarian">Bulgarian</option>
            </select>
          </div>

          {/* Generate Button */}
          <div className="mb-6 text-center">
            <button
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGenerate}
              disabled={isLoading || !selectedCv || !jobDescription}
            >
              {isLoading ? (
                <span className="flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5 mr-2" />Generating...</span>
              ) : (
                'Generate Cover Letter'
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
          {coverLetter && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Generated Cover Letter</h2>
                <button
                  onClick={() => {
                    // Copy to clipboard functionality
                    navigator.clipboard.writeText(coverLetter);
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  title="Copy to clipboard"
                >
                  Copy to Clipboard
                </button>
              </div>
              <div 
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
                  fontSize: '0.9375rem' // Match default text size
                }}
              />
              <div className="mt-4 flex justify-center">
                <button
                  onClick={async () => {
                    try {
                      const element = document.getElementById('cover-letter-content');
                      if (!element) return;
                      
                      // Create a clone of the element to avoid affecting the original
                      const elementClone = element.cloneNode(true) as HTMLElement;
                      document.body.appendChild(elementClone);
                      elementClone.style.position = 'fixed';
                      elementClone.style.left = '-9999px';
                      elementClone.style.top = '0';
                      
                      // Set a white background to ensure good contrast
                      elementClone.style.backgroundColor = 'white';
                      
                      // Remove any problematic CSS properties
                      const allElements = elementClone.getElementsByTagName('*');
                      for (let i = 0; i < allElements.length; i++) {
                        const el = allElements[i] as HTMLElement;
                        // Remove any problematic color functions
                        if (el.style.color.includes('oklch')) {
                          el.style.color = '';
                        }
                        if (el.style.backgroundColor?.includes('oklch')) {
                          el.style.backgroundColor = '';
                        }
                      }
                      
                      try {
                        // Create a temporary container for better rendering
                        const tempContainer = document.createElement('div');
                        tempContainer.style.position = 'absolute';
                        tempContainer.style.left = '-9999px';
                        tempContainer.style.top = '0';
                        tempContainer.style.width = '210mm'; // A4 width
                        tempContainer.style.padding = '20px';
                        tempContainer.style.background = 'white';
                        
                        // Clone and clean the content
                        const cleanClone = elementClone.cloneNode(true) as HTMLElement;
                        cleanClone.style.all = 'revert';
                        cleanClone.style.width = '100%';
                        cleanClone.style.padding = '20px';
                        cleanClone.style.boxSizing = 'border-box';
                        
                        // Add to temp container
                        tempContainer.appendChild(cleanClone);
                        document.body.appendChild(tempContainer);
                        
                        try {
                          // Generate the canvas with explicit type assertion
                          const options: Html2CanvasOptions = {
                            scale: 2,
                            logging: false,
                            useCORS: true,
                            allowTaint: true,
                            backgroundColor: null,
                            removeContainer: false
                          };
                          
                          const canvas = await html2canvas(cleanClone, options);
                          
                          // Create PDF
                          const pdf = new jsPDF('p', 'mm', 'a4');
                          const imgData = canvas.toDataURL('image/png');
                          const pdfWidth = pdf.internal.pageSize.getWidth() - 40; // 20mm margins
                          const imgHeight = (canvas.height * pdfWidth) / canvas.width;
                          
                          // Add image to PDF with margins
                          pdf.addImage(
                            imgData,
                            'PNG',
                            20, // x
                            20, // y
                            pdfWidth,
                            imgHeight
                          );
                          
                          // Save the PDF
                          pdf.save('cover-letter.pdf');
                        } finally {
                          // Clean up
                          document.body.removeChild(tempContainer);
                        }
                      } finally {
                        // Clean up the cloned element
                        document.body.removeChild(elementClone);
                      }
                    } catch (error) {
                      console.error('Error generating PDF:', error);
                      setError('Failed to generate PDF. Please try again or copy the text manually.');
                    }
                  }}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download as PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}