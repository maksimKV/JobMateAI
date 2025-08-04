import { jsPDF } from 'jspdf';
import { FeedbackItem } from '@/types';

interface PDFOptions {
  title?: string;
  margin?: number;
  fontSize?: number;
  lineHeight?: number;
  includeCharts?: boolean;
  includeQuestions?: boolean;
  allQuestions?: FeedbackItem[];
}

export async function generatePdf(container: HTMLElement, filename: string, options: PDFOptions = {}): Promise<boolean> {
  const {
    title = 'Interview Statistics',
    margin = 20,
    fontSize = 12,
    lineHeight = 1.5,
    includeCharts = true,
    includeQuestions = true,
    allQuestions = [],
  } = options;

  try {
    // Create a new PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Set default font
    pdf.setFont('helvetica');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(0, 0, 0);

    // Add title
    pdf.setFontSize(18);
    pdf.text(title, margin, margin + 10);
    
    // Add date
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, margin + 16);
    
    // Reset font size for content
    pdf.setFontSize(fontSize);
    
    // Current y-position in the document
    let yPosition = margin + 30;
    const pageWidth = pdf.internal.pageSize.getWidth() - (margin * 2);

    // Process charts/graphics if enabled
    if (includeCharts) {
      const charts = container.querySelectorAll('canvas, img');
      for (const chart of Array.from(charts)) {
        if (chart instanceof HTMLCanvasElement || chart instanceof HTMLImageElement) {
          try {
            // Skip if chart is not visible
            const style = window.getComputedStyle(chart);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              continue;
            }

            // Convert canvas/image to data URL
            let dataUrl: string;
            
            if (chart instanceof HTMLCanvasElement) {
              dataUrl = chart.toDataURL('image/png');
            } else {
              dataUrl = chart.src;
            }
            
            // Calculate dimensions to maintain aspect ratio
            const imgWidth = pageWidth;
            const imgHeight = (chart.height / chart.width) * imgWidth;
            
            // Check if we need a new page (only if there's not enough space for the image)
            if (yPosition + imgHeight > pdf.internal.pageSize.getHeight() - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            
            // Add the image
            pdf.addImage(dataUrl, 'PNG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 10; // Add some space after the image
            
          } catch (error) {
            console.warn('Could not process chart:', error);
          }
        }
      }
      // Add some space after charts before starting questions
      yPosition += 10;
    }

    // Process questions and answers if enabled
    if (includeQuestions && allQuestions.length > 0) {
      console.log(`Processing ${allQuestions.length} questions for PDF`);
      
      // Add a section header
      const sectionTitle = 'Interview Questions & Feedback';
      const titleLines = pdf.splitTextToSize(sectionTitle, pageWidth);
      const titleHeight = (titleLines.length * fontSize * lineHeight) / 2.8;
      
      // Add new page if needed for the section title
      if (yPosition + titleHeight > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(fontSize + 2);
      pdf.text(titleLines, margin, yPosition, { maxWidth: pageWidth });
      yPosition += titleHeight + 10;
      pdf.setFontSize(fontSize);
      
      // Process all questions from the provided data
      allQuestions.forEach((item, index) => {
        // Remove any existing question numbers from the question text
        const cleanQuestionText = item.question?.trim().replace(/^\s*\d+[.)]\s*/, '') || 'Question';
        const answerText = item.answer?.trim() || '';
        const feedbackText = item.evaluation?.trim() || '';
        const score = item.score !== undefined ? `Score: ${item.score}/10` : '';
        const type = item.type || '';
        
        // Calculate text dimensions for page breaking
        const questionNumber = index + 1;
        const questionPrefix = `Question ${questionNumber}: `;
        const questionText = cleanQuestionText;
        
        // First, render the question text with full width
        pdf.setFont('helvetica', 'bold');
        const questionLines = pdf.splitTextToSize(questionPrefix + questionText, pageWidth);
        const questionHeight = questionLines.length * (fontSize * lineHeight) / 2.8;
        
        // Add answer and feedback lines calculation
        const answerLines = answerText ? pdf.splitTextToSize(`Your Answer: ${answerText}`, pageWidth) : [];
        const feedbackLines = feedbackText ? pdf.splitTextToSize(`Feedback: ${feedbackText}`, pageWidth) : [];
        const scoreLines = score ? pdf.splitTextToSize(score, pageWidth) : [];
        
        const answerHeight = answerLines.length * (fontSize * lineHeight) / 2.8;
        const feedbackHeight = feedbackLines.length * (fontSize * lineHeight) / 2.8;
        const scoreHeight = scoreLines.length * (fontSize * lineHeight) / 2.8;
        const totalHeight = questionHeight + answerHeight + feedbackHeight + scoreHeight + 20;
        
        // Add new page only if we don't have enough space for the entire question
        const minSpaceNeeded = (fontSize * lineHeight * 3) + 20; // At least 3 lines of text + padding
        if (yPosition > margin + minSpaceNeeded && yPosition + totalHeight > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        // Render question lines
        for (let i = 0; i < questionLines.length; i++) {
          const line = questionLines[i];
          const isLastLine = i === questionLines.length - 1;
          
          if (isLastLine && type) {
            // For the last line, calculate space for the badge
            const lineWidth = pdf.getTextWidth(line);
            const badgeWidth = addQuestionTypeBadge(pdf, type, margin + lineWidth + 1, yPosition, fontSize);
            
            if (lineWidth + badgeWidth + 5 < pageWidth) {
              // If there's space, add the badge on the same line
              pdf.text(line, margin, yPosition);
            } else {
              // Otherwise, add the line and then the badge on a new line
              pdf.text(line, margin, yPosition);
              yPosition += (fontSize * lineHeight) / 2.8;
              addQuestionTypeBadge(pdf, type, margin, yPosition, fontSize);
            }
          } else {
            // Regular line, just render it
            pdf.text(line, margin, yPosition);
          }
          
          yPosition += (fontSize * lineHeight) / 2.8;
        }
        
        // Add space after question
        yPosition += 5;

        // Add answer if exists
        if (answerLines.length > 0) {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(50, 50, 50);
          pdf.text(answerLines, margin, yPosition, { maxWidth: pageWidth });
          yPosition += answerHeight + 5;
        }

        // Add feedback if exists
        if (feedbackLines.length > 0) {
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(0, 100, 0);
          
          if (scoreLines.length > 0) {
            pdf.text(scoreLines, margin, yPosition, { maxWidth: pageWidth });
            yPosition += scoreHeight + 2;
          }
          
          pdf.text(feedbackLines, margin, yPosition, { maxWidth: pageWidth });
          yPosition += feedbackHeight + 10;
          
          // Reset text color
          pdf.setTextColor(0, 0, 0);
        } else {
          yPosition += 5; // Extra space if no feedback
        }
        
        // Add a separator line between questions if there's space
        if (yPosition < pdf.internal.pageSize.getHeight() - margin - 10) {
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, yPosition, pdf.internal.pageSize.getWidth() - margin, yPosition);
          yPosition += 15;
        }
      });
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}

// Helper function to add question type badge with precise padding
function addQuestionTypeBadge(pdf: jsPDF, type: string, x: number, y: number, baseFontSize: number): number {
  // Map question types to their display names and colors
  let typeDisplay = type;
  let bgColor: [number, number, number] = [200, 200, 200];
  let textColor: [number, number, number] = [0, 0, 0];
  
  // Set colors based on question type
  if (type.toLowerCase() === 'hr') {
    bgColor = [224, 231, 255];
    textColor = [55, 48, 163];
    typeDisplay = 'HR';
  } else if (type.toLowerCase().includes('tech')) {
    bgColor = [252, 231, 243];
    textColor = [157, 23, 77];
    typeDisplay = type.toLowerCase() === 'tech_theory' ? 'Technical (Theory)' : 
                 type.toLowerCase() === 'tech_practical' ? 'Technical (Practical)' : 'Technical';
  } else if (type.toLowerCase() === 'non_technical') {
    bgColor = [254, 243, 199];
    textColor = [146, 64, 14];
    typeDisplay = 'Non-Technical';
  }
  
  // Save current styles
  const currentFontSize = pdf.getFontSize();
  const currentTextColor = pdf.getTextColor();
  
  // Set badge font size and calculate dimensions
  const badgeFontSize = baseFontSize * 0.8;
  pdf.setFontSize(badgeFontSize);
  pdf.setFont('helvetica', 'normal');
  
  const textWidth = pdf.getTextWidth(typeDisplay);
  const textHeight = badgeFontSize * 0.8; // Approximate text height
  
  // Calculate badge dimensions with minimal padding
  const paddingX = 3; // Horizontal padding
  const paddingY = 1; // Vertical padding
  const badgeWidth = textWidth + (paddingX * 2);
  const badgeHeight = textHeight + (paddingY * 2);
  
  // Calculate vertical position to align with text baseline
  const badgeY = y - (textHeight * 0.7); // Fine-tuned vertical alignment
  
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
  pdf.text(typeDisplay, x + paddingX, y);
  
  // Restore styles
  pdf.setFontSize(currentFontSize);
  pdf.setTextColor(currentTextColor);
  
  // Return the actual badge width used for calculations
  return badgeWidth;
}

// Helper function to get badge width for calculations
function getBadgeWidth(pdf: jsPDF, type: string, baseFontSize: number): number {
  let typeDisplay = type;
  if (type.toLowerCase() === 'hr') {
    typeDisplay = 'HR';
  } else if (type.toLowerCase() === 'tech_theory') {
    typeDisplay = 'Technical (Theory)';
  } else if (type.toLowerCase() === 'tech_practical') {
    typeDisplay = 'Technical (Practical)';
  } else if (type.toLowerCase() === 'non_technical') {
    typeDisplay = 'Non-Technical';
  }
  
  // Set the same font size as used in rendering
  const currentFontSize = pdf.getFontSize();
  pdf.setFontSize(baseFontSize * 0.8);
  pdf.setFont('helvetica', 'normal');
  
  const textWidth = pdf.getTextWidth(typeDisplay);
  
  // Restore font size
  pdf.setFontSize(currentFontSize);
  
  // Return width with the same padding as in addQuestionTypeBadge
  return textWidth + 6; // 3px padding on each side
}
