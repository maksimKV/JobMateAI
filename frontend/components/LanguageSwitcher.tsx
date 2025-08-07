'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher() {
  const t = useTranslations('common.language');
  const pathname = usePathname();
  const currentLocale = useLocale();

  const changeLanguage = (newLocale: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (newLocale === currentLocale) return;
      
      // Get the current path without the locale
      const pathWithoutLocale = pathname.replace(new RegExp(`^/${currentLocale}`), '');
      
      // Create the new path with the new locale
      const newPath = `/${newLocale}${pathWithoutLocale || '/'}`;
      
      // Set a cookie for the new locale
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      
      // Force a hard navigation to the new URL
      window.location.href = newPath;
      
    } catch (error) {
      console.error('Error changing language:', error);
      alert('Failed to change language. Please try again.');
    }
  };

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100 rounded-full">
            <Globe className="h-5 w-5" />
            <span className="sr-only">{t('select')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="min-w-[100px] bg-white border border-gray-200 rounded-md shadow-lg z-[100]"
          sideOffset={8}
        >
          <DropdownMenuItem 
            onClick={(e) => changeLanguage('en', e)}
            className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
              currentLocale === 'en' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            {t('en')}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => changeLanguage('bg', e)}
            className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
              currentLocale === 'bg' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            {t('bg')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
