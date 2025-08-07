import { useTranslations } from 'next-intl';
import Navigation from '@/components/Navigation';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const t = useTranslations('common');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Navigation />
      
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-12 w-12 text-blue-600 mr-3" />
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
            {t('welcome')}
          </h1>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          {t('welcome')} {/* Using existing welcome key */}
        </p>
      </div>

      {/* Rest of your home page content */}
    </div>
  );
}
