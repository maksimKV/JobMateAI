import { getRequestConfig } from 'next-intl/server';
import { IntlError } from 'next-intl';
import fs from 'fs';
import path from 'path';

// Define types for message objects
type MessageValue = string | Record<string, unknown>;
type MessageObject = Record<string, MessageValue>;


// Function to load all JSON files from a directory
async function loadMessages(locale: string): Promise<Record<string, MessageObject>> {

  try {
    const cwd = process.cwd();
    const appDir = path.join(cwd, 'app');
    const messages: Record<string, MessageObject> = {};
    
    // Map of directory names to their corresponding namespaces
    const namespaceMap: Record<string, string> = {
      'code-reviewer': 'codeReviewer',
      'cover-letter': 'coverLetter',
      'cv-analyzer': 'cvAnalyzer',
      'job-scanner': 'jobScanner',
      'interview-simulator': 'interviewSimulator',
      'home': 'home',
      'statistics': 'statistics',
      'common': 'common',
      'navigation': 'navigation'
    };
    
    // Process each page directory directly
    const pageDirs = Object.keys(namespaceMap);
    
    for (const pageDir of pageDirs) {
      const namespace = namespaceMap[pageDir];
      const pagePath = path.join(appDir, '[locale]', pageDir);
      const localeFile = path.join(pagePath, `${locale}.json`);
      
      if (fs.existsSync(localeFile)) {
        try {
          const fileContent = fs.readFileSync(localeFile, 'utf-8');
          const jsonContent = JSON.parse(fileContent);
          
          // Use the mapped namespace
          messages[namespace] = jsonContent;
          

        } catch (error) {
          console.error(`[i18n] Error loading file ${localeFile}:`, error);
        }
      } else {
        console.warn(`[i18n] Translation file not found: ${localeFile}`);
      }
    }
    

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
