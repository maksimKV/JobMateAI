'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { statisticsAPI, APIError } from '@/lib/api';
import { 
  StatisticsRequest, 
  StatisticsResponse, 
  FeedbackItem, 
  SessionData 
} from '@/types';
import { Loader2, AlertCircle, BarChart2, Download } from 'lucide-react';
import { SessionInfo } from './components/SessionInfo';
import { QuestionsList } from './components/QuestionsList';
import { ChartsSection } from './components/ChartsSection';
import { generatePdf } from '@/lib/pdf';

const QUESTIONS_PER_PAGE = 1;
type QuestionType = 'all' | 'hr' | 'technical' | 'non_technical';

export default function StatisticsPage() {
  const t = useTranslations('statistics.page');
  // Removed unused router
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [questionType, setQuestionType] = useState<QuestionType>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const hasHRQuestions = useMemo(() => {
    return sessionData?.feedback?.some(item => 
      item.type?.toLowerCase() === 'hr'
    ) || false;
  }, [sessionData]);

  const hasTechnicalQuestions = useMemo(() => {
    return sessionData?.feedback?.some(item => {
      const type = item.type?.toLowerCase();
      return type === 'technical' || type === 'tech_theory' || type === 'tech_practical';
    }) || false;
  }, [sessionData]);

  const hasNonTechnicalQuestions = useMemo(() => {
    return sessionData?.feedback?.some(item => 
      item.type?.toLowerCase() === 'non_technical'
    ) || false;
  }, [sessionData]);
  
  useEffect(() => {
    if (sessionData?.feedback) {
      const filterQuestionsByType = (questions: FeedbackItem[]) => {
        if (!questions) return [];
        if (questionType === 'all') return [...questions];
        return questions.filter(question => {
          const qType = question.type?.toLowerCase();
          if (questionType === 'technical') {
            return qType === 'technical' || qType === 'tech_theory' || qType === 'tech_practical';
          }
          return qType === questionType;
        });
      };
      
      const filteredQuestions = filterQuestionsByType(sessionData.feedback);
      const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE) || 1;
      setTotalPages(totalPages);
      
      if (currentPage > totalPages) {
        setCurrentPage(1);
      }
    }
  }, [sessionData, questionType, currentPage]);
  
  const getCurrentQuestions = useMemo(() => {
    const filterQuestionsByType = (questions: FeedbackItem[]) => {
      if (!questions) return [];
      if (questionType === 'all') return [...questions];
      return questions.filter(question => {
        const qType = question.type?.toLowerCase();
        if (questionType === 'technical') {
          return qType === 'technical' || qType === 'tech_theory' || qType === 'tech_practical';
        }
        return qType === questionType;
      });
    };
    
    if (!sessionData?.feedback) return [];
    
    const filteredQuestions = filterQuestionsByType(sessionData.feedback);
    const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
    const endIndex = startIndex + QUESTIONS_PER_PAGE;
    
    return filteredQuestions.slice(startIndex, endIndex);
  }, [sessionData?.feedback, questionType, currentPage]);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const questionsSection = document.getElementById('questions-section');
    if (questionsSection) {
      questionsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const handleTypeChange = (type: QuestionType) => {
    setQuestionType(type);
    setCurrentPage(1);
  };
  
  const fetchStatistics = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    setStats(null);
    
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      const req: StatisticsRequest = { session_id: id };
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await statisticsAPI.getCharts(req);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (response) {
        setStats(response);
      } else {
        setError(t('errors.fetchFailed'));
      }
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (err instanceof APIError) {
        setError(err.message);
      } else if (err instanceof Error && err.name === 'AbortError') {
        setError(t('errors.timeout'));
      } else if (err instanceof Error) {
        setError(t('errors.generic', { message: err.message }));
      } else {
        setError(t('errors.unexpected'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    setIsClient(true);
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const savedSession = localStorage.getItem('interviewSession');
        
        if (savedSession) {
          try {
            const session = JSON.parse(savedSession);
            
            if (session && typeof session === 'object' && 'sessionId' in session) {
              const sessionData: SessionData = {
                sessionId: session.sessionId,
                questions: Array.isArray(session.questions) ? session.questions : [],
                feedback: Array.isArray(session.feedback) ? session.feedback : [],
                company_name: session.company_name || t('defaults.company'),
                position: session.position || t('defaults.position'),
                timestamp: session.timestamp || new Date().toISOString(),
                interviewType: session.interviewType || 'hr'
              };
              
              setSessionData(sessionData);
              
              if (session.sessionId) {
                await fetchStatistics(session.sessionId);
              } else {
                setError(t('errors.noSessionId'));
              }
            } else {
              setError(t('errors.invalidSessionData'));
            }
          } catch {
            setError(t('errors.parseError'));
          }
        } else {
          setError(t('errors.noSessionFound'));
        }
      } catch {
        setError(t('errors.loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchStatistics, t]);

  const handleDownloadPdf = useCallback(async () => {
    if (!contentRef.current) return;
    
    setIsGeneratingPdf(true);
    try {
      const formatDate = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
      };
      
      const companyName = sessionData?.company_name || t('defaults.company');
      const position = sessionData?.position || '';
      const formattedDate = formatDate(new Date());
      const filename = `${t('pdf.filename', { 
        company: companyName, 
        position: position ? `, ${t('pdf.for')} ${position}` : '' 
      })} - ${formattedDate}`;
      
      const allQuestions = sessionData?.feedback || [];
      
      const pdfSessionData = stats?.scores ? {
        scores: {
          byCategory: {
            hr: {
              average: stats.scores.by_category?.hr?.score || 0,
              count: stats.scores.by_category?.hr?.total_questions || 0
            },
            technical: {
              average: stats.scores.by_category?.tech_theory?.score || 
                      stats.scores.by_category?.tech_practical?.score || 0,
              count: (stats.scores.by_category?.tech_theory?.total_questions || 0) + 
                    (stats.scores.by_category?.tech_practical?.total_questions || 0)
            },
            non_technical: {
              average: stats.scores.by_category?.non_technical?.score || 0,
              count: stats.scores.by_category?.non_technical?.total_questions || 0
            }
          },
          overallAverage: stats.scores.overall?.average || 0
        }
      } : undefined;

      await generatePdf(contentRef.current, filename, {
        includeCharts: true,
        includeQuestions: true,
        allQuestions,
        sessionData: pdfSessionData,
        getTranslation: (key: string) => t(`pdf.${key}`)
      });
    } catch {
      setError(t('errors.pdfGenerationFailed'));
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [sessionData, stats, t]);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-2">
              <Loader2 className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">
                {t('loading.title')}
              </h1>
            </div>
            <p className="text-gray-600">{t('loading.subtitle')}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <BarChart2 className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">
              {t('title')}
            </h1>
          </div>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        <div ref={contentRef} className="bg-white rounded-lg shadow p-6">
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold text-center mb-2">{t('pdf.title')}</h1>
            <p className="text-center text-gray-600 text-sm">
              {t('pdf.generatedOn', { 
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString()
              })}
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mr-3" />
              <p className="text-gray-600">{t('loading.loadingStats')}</p>
            </div>
          ) : error ? (
            <div className="space-y-6">
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-700">{error}</p>
                    <p className="text-sm text-red-600 mt-1">
                      {error === t('errors.noSessionFound')
                        ? t('errors.completeInterviewFirst')
                        : t('errors.tryAgainLater')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h2 className="text-lg font-semibold text-blue-800 mb-2">
                  {t('whatsNext.title')}
                </h2>
                <ul className="list-disc pl-5 space-y-1 text-blue-700">
                  <li>{t('whatsNext.startNewInterview')}</li>
                  <li>{t('whatsNext.completeQuestions')}</li>
                  <li>{t('whatsNext.viewHistory')}</li>
                </ul>
              </div>
            </div>
          ) : !stats || !sessionData?.feedback?.length ? (
            <div className="text-center py-12">
              <BarChart2 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-medium text-gray-900">
                {t('noData.title')}
              </h2>
              <p className="mt-2 text-gray-600 max-w-md mx-auto">
                {t('noData.description')}
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('noData.cta')}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <SessionInfo 
                sessionData={sessionData}
                actionButton={
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    title={t('downloadPdf')}
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        {t('generating')}
                      </>
                    ) : (
                      <>
                        <Download className="-ml-1 mr-2 h-4 w-4" />
                        {t('downloadPdf')}
                      </>
                    )}
                  </button>
                }
              />
              
              <div className="mt-8">
                <ChartsSection stats={stats} />
              </div>
              
              <div id="questions-section" className="mt-8">
                <QuestionsList 
                  questions={getCurrentQuestions}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  questionType={questionType}
                  hasHRQuestions={hasHRQuestions}
                  hasTechnicalQuestions={hasTechnicalQuestions}
                  hasNonTechnicalQuestions={hasNonTechnicalQuestions}
                  onPageChange={handlePageChange}
                  onTypeChange={handleTypeChange}
                  questionsPerPage={QUESTIONS_PER_PAGE}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Add print styles
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    .printable-content, .printable-content * {
      visibility: visible;
    }
    .printable-content {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
    .no-print, .no-print * {
      display: none !important;
    }
  }
`;

// Add print styles to document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = printStyles;
  document.head.appendChild(styleElement);
}