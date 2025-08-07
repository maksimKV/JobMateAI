import { getRequestConfig } from 'next-intl/server';
import { IntlError } from 'next-intl';
import fs from 'fs';
import path from 'path';

// Define types for message objects
type MessageValue = string | Record<string, unknown>;
type MessageObject = Record<string, MessageValue>;

// Helper function to flatten nested objects with dot notation
function flattenMessages(nestedMessages: MessageObject, prefix = ''): Record<string, string> {
  return Object.keys(nestedMessages).reduce<Record<string, string>>((messages, key) => {
    const value = nestedMessages[key];
    const prefixedKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      return { ...messages, [prefixedKey]: value };
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return {
        ...messages,
        ...flattenMessages(value as MessageObject, prefixedKey)
      };
    }

    return messages;
  }, {} as Record<string, string>);
}

// Function to load all JSON files from a directory
async function loadMessages(locale: string): Promise<Record<string, MessageObject>> {
  console.log(`[i18n] Loading messages for locale: ${locale}`);
  try {
    const cwd = process.cwd();
    const appDir = path.join(cwd, 'app');
    const messages: Record<string, MessageObject> = {};
    
    // Process each page directory directly
    const pageDirs = [
      'code-reviewer', 'cover-letter', 'cv-analyzer', 
      'home', 'interview-simulator', 'job-scanner', 
      'statistics', 'common', 'navigation'
    ];
    
    for (const pageDir of pageDirs) {
      const pagePath = path.join(appDir, '[locale]', pageDir);
      const localeFile = path.join(pagePath, `${locale}.json`);
      
      if (fs.existsSync(localeFile)) {
        try {
          const fileContent = fs.readFileSync(localeFile, 'utf-8');
          const jsonContent = JSON.parse(fileContent);
          
          // Use the directory name as the namespace
          messages[pageDir] = jsonContent;
          
          console.log(`[i18n] Loaded ${Object.keys(jsonContent).length} keys for namespace '${pageDir}'`);
        } catch (error) {
          console.error(`[i18n] Error loading file ${localeFile}:`, error);
        }
      } else {
        console.warn(`[i18n] Translation file not found: ${localeFile}`);
      }
    }
    
    console.log(`[i18n] Loaded translations for ${Object.keys(messages).length} namespaces`);
    return messages;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    throw error;
  }
}

export default getRequestConfig(async ({ locale = 'en' }) => {
  if (!locale) throw new Error('Locale is required');
  
  try {
    const messages = await loadMessages(locale);
    
    // Log available namespaces for debugging
    console.log('[i18n] Available namespaces:', Object.keys(messages));
    
    return {
      locale,
      messages,
      onError: (error: IntlError) => {
        if (error.code === 'MISSING_MESSAGE') {
          // @ts-expect-error - error.key exists on MISSING_MESSAGE errors
          console.warn('Missing translation:', error.key, 'for locale:', locale);
          return;
        }
        console.error('Translation error:', error);
      },
      // Disable default error messages in production
      defaultTranslationValues: {
        strong: (chunks: React.ReactNode) => chunks,
        em: (chunks: React.ReactNode) => chunks,
      },
      // Fallback to English if translation is missing
      defaultLocale: 'en',
      // Disable text encoder as it's not needed in this context
      textEncoder: undefined,
    };
  } catch (error) {
    console.error(`[i18n:error] Failed to load messages for locale: ${locale}`, error);
    // Fallback to empty messages to prevent build failure
    return {
      locale,
      messages: {}
    };
  }
});
