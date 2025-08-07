import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import LocaleLayout from './LocaleLayout';
import '../../app/globals.css';
import { Metadata } from 'next';
// Import the Messages type from our translations definition
import type { Messages } from '@/types/translations';

const inter = Inter({ subsets: ['latin'] });

// This is required for static generation
export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'bg' }];
}

// This is the metadata for the page
export const metadata: Metadata = {
  title: 'JobMate AI - Your AI Career Mentor',
  description: 'AI-powered career development and interview preparation platform',
  keywords: ['career', 'interview', 'AI', 'resume', 'job application'],
};

// Define the props type for the layout
interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// This is the main layout component
export default async function RootLayout({ children, params: paramsPromise }: RootLayoutProps) {
  // Await the params promise first
  const { locale } = await paramsPromise;
  
  // Load messages for the current locale
  let messages: Messages;
  try {
    // Import all translation files
    const [
      commonMessages,
      navMessages,
      cvAnalyzerMessages,
      codeReviewerMessages,
      jobScannerMessages,
      interviewSimulatorMessages,
      coverLetterMessages,
      statisticsMessages
    ] = await Promise.all([
      import(`./common/${locale}.json`).then(m => m.default),
      import(`./navigation/${locale}.json`).then(m => m.default),
      import(`./cv-analyzer/${locale}.json`).then(m => m.default),
      import(`./code-reviewer/${locale}.json`).then(m => m.default),
      import(`./job-scanner/${locale}.json`).then(m => m.default),
      import(`./interview-simulator/${locale}.json`).then(m => m.default),
      import(`./cover-letter/${locale}.json`).then(m => m.default),
      import(`./statistics/${locale}.json`).then(m => m.default)
    ]);
    
    // Create messages object with proper typing
    messages = {
      common: commonMessages,
      navigation: navMessages,
      cvAnalyzer: cvAnalyzerMessages,
      codeReviewer: codeReviewerMessages,
      jobScanner: jobScannerMessages,
      interviewSimulator: interviewSimulatorMessages,
      coverLetter: coverLetterMessages,
      statistics: statisticsMessages
    };
    
    if (!messages || Object.keys(messages).length === 0) {
      console.error(`No messages found for locale: ${locale}`);
      notFound();
    }
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    notFound();
  }

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <LocaleLayout locale={locale} messages={messages}>
          {children}
        </LocaleLayout>
      </body>
    </html>
  );
}
