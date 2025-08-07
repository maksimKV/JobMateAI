'use client';

import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// SVG flag components
const FlagUK = () => (
  <svg width="20" height="16" viewBox="0 0 60 30" className="shrink-0">
    <clipPath id="a">
      <path d="M0 0v30h60V0z"/>
    </clipPath>
    <clipPath id="b">
      <path d="M30 15h30v15zv15H0zH0V0z"/>
    </clipPath>
    <g clipPath="url(#a)">
      <path d="M0 0v30h60V0z" fill="#012169"/>
      <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" strokeLinecap="square"/>
      <path d="M0 0l60 30m0-30L0 30" clipPath="url(#b)" stroke="#C8102E" strokeWidth="4" strokeLinecap="square"/>
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

const FlagBG = () => (
  <svg width="20" height="16" viewBox="0 0 60 40" className="shrink-0">
    <rect width="60" height="13.3" fill="#fff"/>
    <rect y="13.3" width="60" height="13.3" fill="#00966E"/>
    <rect y="26.6" width="60" height="13.4" fill="#D62612"/>
  </svg>
);

const languageMap = {
  en: { name: 'English', flag: <FlagUK /> },
  bg: { name: 'Български', flag: <FlagBG /> }
} as const;

export function LanguageSwitcher() {
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

  const currentLanguage = languageMap[currentLocale as keyof typeof languageMap] || languageMap.en;

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 border-gray-200 hover:bg-gray-50"
          >
            <span className="text-lg">{currentLanguage.flag}</span>
            <span>{currentLanguage.name}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="min-w-[150px] bg-white border border-gray-200 rounded-md shadow-lg z-[100]"
          sideOffset={8}
        >
          {Object.entries(languageMap).map(([code, { name, flag }]) => (
            <DropdownMenuItem 
              key={code}
              onClick={(e) => changeLanguage(code, e)}
              className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                currentLocale === code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{flag}</span>
                <span>{name}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
