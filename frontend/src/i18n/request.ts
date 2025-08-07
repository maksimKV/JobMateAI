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
  try {
    // Path is relative to the frontend directory
    const appDir = path.join(process.cwd(), 'app');
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
    processDirectory(localePath);
    
    // Flatten the messages object
    return flattenMessages(messages);
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    throw error;
  }
}

export default getRequestConfig(async ({ locale = 'en' }) => {
  if (!locale) throw new Error('Locale is required');
  
  try {
    const messages = await loadMessages(locale);
    
    if (Object.keys(messages).length === 0) {
      console.warn(`No messages found for locale: ${locale}`);
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
