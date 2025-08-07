import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { BackendProvider } from '@/providers/BackendProvider';

// Define a recursive type for nested translation objects
type NestedMessages = {
  [key: string]: string | NestedMessages;
};

interface LocaleLayoutProps {
  children: ReactNode;
  locale: string;
  messages: NestedMessages;
}

export default function LocaleLayout({ children, locale, messages }: LocaleLayoutProps) {
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
