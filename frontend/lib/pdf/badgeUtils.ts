import { jsPDF } from 'jspdf';
import { BadgeDimensions } from './types';

/**
 * Gets the display text and colors for a question type badge
 */
function getBadgeConfig(type: string): {
  text: string;
  bgColor: [number, number, number];
  textColor: [number, number, number];
} {
  const lowerType = type.toLowerCase();
  
  if (lowerType === 'hr') {
    return {
      text: 'HR',
      bgColor: [224, 231, 255],
      textColor: [55, 48, 163]
    };
  }
  
  if (lowerType.includes('tech')) {
    const displayText = lowerType === 'tech_theory' 
      ? 'Technical (Theory)' 
      : lowerType === 'tech_practical' 
        ? 'Technical (Practical)' 
        : 'Technical';
    
    return {
      text: displayText,
      bgColor: [252, 231, 243],
      textColor: [157, 23, 77]
    };
  }
  
  if (lowerType === 'non_technical') {
    return {
      text: 'Non-Technical',
      bgColor: [254, 243, 199],
      textColor: [146, 64, 14]
    };
  }
  
  // Default for unknown types
  return {
    text: type,
    bgColor: [200, 200, 200],
    textColor: [0, 0, 0]
  };
}

/**
 * Calculates badge dimensions without rendering
 */
export function getBadgeWidth(pdf: jsPDF, type: string, baseFontSize: number): number {
  const { text } = getBadgeConfig(type);
  
  // Set the same font size as used in rendering
  const currentFontSize = pdf.getFontSize();
  const badgeFontSize = baseFontSize * 0.8;
  pdf.setFontSize(badgeFontSize);
  pdf.setFont('helvetica', 'normal');
  
  const textWidth = pdf.getTextWidth(text);
  
  // Restore font size
  pdf.setFontSize(currentFontSize);
  
  // Return width with minimal padding (2px on each side)
  return textWidth + 4;
}

/**
 * Renders a question type badge in the PDF
 */
export function addQuestionTypeBadge(
  pdf: jsPDF, 
  type: string, 
  x: number, 
  y: number, 
  baseFontSize: number
): number {
  const { text, bgColor, textColor } = getBadgeConfig(type);
  
  // Save current styles
  const currentFontSize = pdf.getFontSize();
  const currentTextColor = pdf.getTextColor();
  
  // Set badge font size and calculate dimensions
  const badgeFontSize = baseFontSize * 0.8;
  pdf.setFontSize(badgeFontSize);
  pdf.setFont('helvetica', 'normal');
  
  const textWidth = pdf.getTextWidth(text);
  const textHeight = badgeFontSize * 0.8; // Approximate text height
  
  // Calculate badge dimensions with minimal padding
  const paddingX = 2;
  const paddingY = 1;
  const badgeWidth = textWidth + (paddingX * 2);
  const badgeHeight = textHeight + (paddingY * 2);
  
  // Position the badge relative to the text baseline
  const badgeY = y - (textHeight * 0.7);
  
  // Draw the badge background
  pdf.setFillColor(...bgColor);
  pdf.roundedRect(
    x,
    badgeY,
    badgeWidth,
    badgeHeight,
    2, // Border radius
    2,
    'F'
  );
  
  // Add the type text
  pdf.setTextColor(...textColor);
  pdf.text(text, x + paddingX, y);
  
  // Restore styles
  pdf.setFontSize(currentFontSize);
  pdf.setTextColor(currentTextColor);
  
  return badgeWidth;
}
