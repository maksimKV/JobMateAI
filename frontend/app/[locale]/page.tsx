'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Navigation from '@/components/Navigation';
import { 
  FileText, 
  Mail, 
  Search, 
  MessageSquare, 
  BarChart3, 
  Code,
  Upload,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const t = useTranslations('home');

  // Set isMounted to true when component mounts on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle navigation to ensure it's client-side
  const navigateTo = (path: string) => {
    if (isMounted) {
      router.push(path);
    }
  };

  // Show loading state during SSR or initial client-side render
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Navigation />
          <div className="text-center p-12">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            </div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Navigation />
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
              {t('title')}
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold">{t('features.cvAnalyzer.title')}</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {t('features.cvAnalyzer.description')}
            </p>
            <div className="flex items-center text-sm text-blue-600">
              <Upload className="h-4 w-4 mr-1" />
              {t('features.cvAnalyzer.cta')}
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigateTo('/cover-letter')}
          >
            <div className="flex items-center mb-4">
              <Mail className="h-8 w-8 text-green-600 mr-3" />
              <h3 className="text-xl font-semibold">{t('features.coverLetter.title')}</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {t('features.coverLetter.description')}
            </p>
            <div className="flex items-center text-sm text-green-600">
              <Sparkles className="h-4 w-4 mr-1" />
              {t('features.coverLetter.cta')}
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigateTo('/job-scanner')}
          >
            <div className="flex items-center mb-4">
              <Search className="h-8 w-8 text-purple-600 mr-3" />
              <h3 className="text-xl font-semibold">{t('features.jobScanner.title')}</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {t('features.jobScanner.description')}
            </p>
            <div className="flex items-center text-sm text-purple-600">
              <BarChart3 className="h-4 w-4 mr-1" />
              {t('features.jobScanner.cta')}
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigateTo('/interview-simulator')}
          >
            <div className="flex items-center mb-4">
              <MessageSquare className="h-8 w-8 text-orange-600 mr-3" />
              <h3 className="text-xl font-semibold">{t('features.interviewSimulator.title')}</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {t('features.interviewSimulator.description')}
            </p>
            <div className="flex items-center text-sm text-orange-600">
              <Sparkles className="h-4 w-4 mr-1" />
              {t('features.interviewSimulator.cta')}
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigateTo('/statistics-dashboard')}
          >
            <div className="flex items-center mb-4">
              <BarChart3 className="h-8 w-8 text-indigo-600 mr-3" />
              <h3 className="text-xl font-semibold">{t('features.statistics.title')}</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {t('features.statistics.description')}
            </p>
            <div className="flex items-center text-sm text-indigo-600">
              <BarChart3 className="h-4 w-4 mr-1" />
              {t('features.statistics.cta')}
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigateTo('/code-reviewer')}
          >
            <div className="flex items-center mb-4">
              <Code className="h-8 w-8 text-red-600 mr-3" />
              <h3 className="text-xl font-semibold">{t('features.codeReviewer.title')}</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {t('features.codeReviewer.description')}
            </p>
            <div className="flex items-center text-sm text-red-600">
              <Sparkles className="h-4 w-4 mr-1" />
              {t('features.codeReviewer.cta')}
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('gettingStarted.title')}</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            {t('gettingStarted.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              {t('gettingStarted.uploadButton')}
            </button>
            <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
              {t('gettingStarted.learnMoreButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
