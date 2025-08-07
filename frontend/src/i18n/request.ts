import { getRequestConfig } from 'next-intl/server';
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
    const localePath = path.join(process.cwd(), 'messages', locale);
    const files = fs.readdirSync(localePath);
    
    const messages: MessageObject = {};
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(localePath, file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const jsonContent = JSON.parse(fileContent);
          const namespace = file.replace(/\.json$/, '');
          messages[namespace] = jsonContent;
        } catch (fileError) {
          console.error(`Error loading file ${file}:`, fileError);
          continue;
        }
      }
    }
    
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
    
    return {
      locale,
      messages
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
