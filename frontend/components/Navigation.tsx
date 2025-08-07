'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  Mail, 
  Search, 
  MessageSquare, 
  BarChart3, 
  Code,
  Brain,
  LucideIcon
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  descriptionKey: string;
}

export default function Navigation() {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  const navigation: NavItem[] = [
    {
      name: t('cvAnalyzer'),
      href: '/cv-analyzer',
      icon: FileText,
      descriptionKey: 'cvAnalyzerDesc'
    },
    {
      name: t('coverLetter'),
      href: '/cover-letter',
      icon: Mail,
      descriptionKey: 'coverLetterDesc'
    },
    {
      name: t('jobScanner'),
      href: '/job-scanner',
      icon: Search,
      descriptionKey: 'jobScannerDesc'
    },
    {
      name: t('interviewSimulator'),
      href: '/interview-simulator',
      icon: MessageSquare,
      descriptionKey: 'interviewSimulatorDesc'
    },
    {
      name: t('statistics'),
      href: '/statistics',
      icon: BarChart3,
      descriptionKey: 'statisticsDesc'
    },
    {
      name: t('codeReviewer'),
      href: '/code-reviewer',
      icon: Code,
      descriptionKey: 'codeReviewerDesc'
    }
  ];

  return (
    <nav className="bg-white shadow-lg rounded-lg p-4 mb-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">JobMate AI</h1>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {navigation.map((item) => {
            const isActive = pathname?.includes(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative rounded-lg p-4 transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <item.icon 
                    className={`h-6 w-6 mb-2 ${
                      isActive ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600'
                    }`} 
                  />
                  <h3 className={`text-sm font-medium ${
                    isActive ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 hidden md:block">
                    {t(item.descriptionKey as string)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
} 