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
async function loadMessages(locale: string): Promise<Record<string, string>> {
  console.log(`[i18n] Loading messages for locale: ${locale}`);
  try {
    // Path is relative to the frontend directory
    const cwd = process.cwd();
    console.log(`[i18n] Current working directory: ${cwd}`);
    
    const appDir = path.join(cwd, 'app');
    console.log(`[i18n] App directory: ${appDir}`);
    
    const messages: MessageObject = {};

    // Function to process a directory and its subdirectories
    const processDirectory = (dirPath: string, namespace = '') => {
      if (fs.existsSync(dirPath)) {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            // Recursively process subdirectories
            const newNamespace = namespace ? `${namespace}.${item}` : item;
            processDirectory(itemPath, newNamespace);
          } else if (item.endsWith('.json')) {
            try {
              const fileContent = fs.readFileSync(itemPath, 'utf-8');
              const jsonContent = JSON.parse(fileContent);
              
              // Use the directory structure to create nested namespaces
              if (namespace) {
                const parts = namespace.split('.');
                let current = messages;
                
                for (let i = 0; i < parts.length; i++) {
                  const part = parts[i];
                  if (i === parts.length - 1) {
                    current[part] = { ...(current[part] as MessageObject || {}), ...jsonContent };
                  } else {
                    if (!current[part]) {
                      current[part] = {};
                    }
                    current = current[part] as MessageObject;
                  }
                }
              } else {
                // For files in the root locale directory
                const fileName = path.basename(item, '.json');
                messages[fileName] = { ...(messages[fileName] as MessageObject || {}), ...jsonContent };
              }
            } catch (fileError) {
              console.error(`Error loading file ${itemPath}:`, fileError);
              continue;
            }
          }
        }
      }
    };

    // Process the locale directory in the app directory
    const localePath = path.join(appDir, '[locale]');
    console.log(`[i18n] Looking for locale directory at: ${localePath}`);
    console.log(`[i18n] Directory exists: ${fs.existsSync(localePath)}`);
    
    // Process each page directory directly since dynamic [locale] path might not be resolved correctly
    const pageDirs = ['code-reviewer', 'cover-letter', 'cv-analyzer', 'home', 'interview-simulator', 'job-scanner', 'statistics', 'common', 'navigation'];
    
    console.log(`[i18n] Processing page directories...`);
    let foundFiles = 0;
    
    for (const pageDir of pageDirs) {
      const pagePath = path.join(localePath, pageDir);
      console.log(`[i18n] Checking page directory: ${pagePath}`);
      
      if (fs.existsSync(pagePath)) {
        console.log(`[i18n] Directory exists: ${pagePath}`);
        try {
          const files = fs.readdirSync(pagePath);
          console.log(`[i18n] Found ${files.length} files in ${pagePath}`);
          
          for (const file of files) {
            console.log(`[i18n] Checking file: ${file}`);
            if (file.endsWith('.json') && file.startsWith(locale)) {
              const filePath = path.join(pagePath, file);
              console.log(`[i18n] Processing translation file: ${filePath}`);
              
              try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const jsonContent = JSON.parse(fileContent);
                const namespace = path.basename(pagePath);
                console.log(`[i18n] Loaded ${Object.keys(jsonContent).length} keys for namespace: ${namespace}`);
                
                messages[namespace] = { 
                  ...(messages[namespace] as MessageObject || {}), 
                  ...jsonContent 
                };
                foundFiles++;
              } catch (error) {
                console.error(`[i18n] Error loading file ${filePath}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`[i18n] Error reading directory ${pagePath}:`, error);
        }
      } else {
        console.warn(`[i18n] Directory does not exist: ${pagePath}`);
      }
    }
    
    console.log(`[i18n] Total translation files loaded: ${foundFiles}`);
    
    // Flatten the messages object
    return flattenMessages(messages);
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    throw error;
  }
}

export default getRequestConfig(async ({ locale = 'en' }) => {
  console.log(`[i18n] Configuring messages for locale: ${locale}`);
  if (!locale) throw new Error('Locale is required');
  
  try {
    const messages = await loadMessages(locale);
    console.log(`[i18n] Loaded messages for ${Object.keys(messages).length} namespaces`);
    
    if (Object.keys(messages).length === 0) {
      console.warn(`[i18n] WARNING: No messages found for locale: ${locale}`);
    } else {
      console.log(`[i18n] Namespaces loaded:`, Object.keys(messages));
    }
    
    return {
      locale,
      messages,
      // Enable on-demand translation loading for better performance
      onError: (error: IntlError) => {
        if (error.code === 'MISSING_MESSAGE') {
          // @ts-expect-error - error.key exists on MISSING_MESSAGE errors
          console.warn('Missing translation:', error.key, 'for locale:', locale);
          return;
        }
        console.error('Translation error:', error);
      }
    };
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    // Fallback to empty messages to prevent build failure
    return {
      locale,
      messages: {}
    };
  }
});
