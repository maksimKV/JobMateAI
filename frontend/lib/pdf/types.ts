import { FeedbackItem } from '@/types';

export type TranslationFunction = (
  key: string,
  values?: Record<string, string | number | boolean | null | undefined>
) => string;

export interface PDFOptions {
  title?: string;
  margin?: number;
  fontSize?: number;
  lineHeight?: number;
  includeCharts?: boolean;
  includeQuestions?: boolean;
  allQuestions?: FeedbackItem[];
  getTranslation?: TranslationFunction;
  sessionData?: {
    scores?: {
      byCategory: {
        [key: string]: {
          average: number;
          count: number;
        };
      };
      overallAverage: number;
    };
  } | null;
}

export interface BadgeDimensions {
  width: number;
  height: number;
  text: string;
  bgColor: [number, number, number];
  textColor: [number, number, number];
}
