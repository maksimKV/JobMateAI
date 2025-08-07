'use client';

import { useRouter } from 'next/navigation';
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
  const locale = useLocale();
  const router = useRouter();

  const changeLanguage = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
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
            onClick={() => changeLanguage('en')} 
            className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
              locale === 'en' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            {t('en')}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => changeLanguage('bg')} 
            className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
              locale === 'bg' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            {t('bg')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
