import { jsPDF } from 'jspdf';
import { FeedbackItem } from '@/types';
import { PDFOptions } from './types';
import { enhanceChartImage } from './chartUtils';
import { addQuestionTypeBadge, getBadgeWidth } from './badgeUtils';

/**
 * Generates a PDF document from the provided container element
 */
export async function generatePdf(
  container: HTMLElement, 
  filename: string, 
  options: PDFOptions = {}
): Promise<boolean> {
  const {
    title = 'Interview Statistics',
    margin = 20,
    fontSize = 12,
    lineHeight = 1.5,
    includeCharts = true,
    includeQuestions = true,
    allQuestions = [],
    sessionData = undefined
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
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Process charts/graphics if enabled
    if (includeCharts) {
      // Find all main chart containers (direct children of the main content area)
      const mainContainers = container.querySelectorAll('div.bg-white.p-6.rounded-lg.shadow');
      
      for (const mainContainer of Array.from(mainContainers)) {
        const title = mainContainer.querySelector('h2')?.textContent || '';
        
        // Skip processing pie chart container
        if (title.includes('Performance by Category')) {
          console.log('Skipping pie chart container...');
          continue;
        }
        
        // Handle other chart containers (like line charts) if needed
        const chartElement = mainContainer.querySelector('canvas');
        if (!chartElement) continue;
        
        // Add title
        if (title) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.text(title, margin, yPosition);
          yPosition += 10;
        }
        
        // Calculate dimensions
        const maxChartHeight = pageHeight - yPosition - margin - 40;
        const chartAspectRatio = chartElement.width / chartElement.height;
        let chartWidth = pageWidth;
        let chartHeight = chartWidth / chartAspectRatio;
        
        if (chartHeight > maxChartHeight) {
          chartHeight = maxChartHeight;
          chartWidth = chartHeight * chartAspectRatio;
        }
        
        try {
          // Convert canvas to data URL with overlays
          const dataUrl = await enhanceChartImage(chartElement);
          
          // Add the enhanced chart image
          pdf.addImage(dataUrl, 'PNG', margin, yPosition, chartWidth, chartHeight);
          
          yPosition += chartHeight + 30; // Add space after the chart
        } catch (error) {
          console.error('Error processing chart:', error);
          // Skip to next chart on error
          continue;
        }
      }
    }

    // Process interview questions if enabled
    if (includeQuestions && allQuestions.length > 0) {
      console.log(`Processing ${allQuestions.length} questions for PDF`);
      
      // Ensure we have enough space for the section title
      const titleLines = ['Interview Questions and Answers'];
      const titleHeight = (fontSize * lineHeight * 1.2) / 2.8; // Slightly larger for section title
      
      // Add new page if needed for the section title
      if (yPosition + titleHeight > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(fontSize + 2);
      pdf.text(titleLines, margin, yPosition);
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
            // First, render the question text
            pdf.text(line, margin, yPosition);
            
            // Calculate the actual rendered width of the text
            const textWidth = pdf.getTextWidth(line);
            
            // Get badge width without rendering it yet
            const badgeWidth = getBadgeWidth(pdf, type, fontSize);
            
            // Add 2px spacing between the question text and the badge
            const desiredSpacing = 2;
            
            // Check if there's enough space for the badge on the same line
            if (textWidth + badgeWidth + desiredSpacing < pageWidth - margin * 2) {
              // If there's space, position the badge with desired spacing after the text
              addQuestionTypeBadge(pdf, type, margin + textWidth + desiredSpacing, yPosition, fontSize);
            } else {
              // Otherwise, move to a new line for the badge
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
