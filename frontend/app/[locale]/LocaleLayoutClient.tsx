'use client';

import { ReactNode, useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { BackendProvider } from '@/providers/BackendProvider';

interface Messages {
  [key: string]: string | Messages;
}

interface LocaleLayoutClientProps {
  children: ReactNode;
  locale: string;
  messages: Messages;
}

export default function LocaleLayoutClient({ children, locale, messages }: LocaleLayoutClientProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div>Loading...</div>;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <BackendProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {children}
        </div>
      </BackendProvider>
    </NextIntlClientProvider>
  );
}
