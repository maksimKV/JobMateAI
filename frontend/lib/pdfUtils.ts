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
        const questionText = item.question?.trim() || 'Question';
        const answerText = item.answer?.trim() || '';
        const feedbackText = item.evaluation?.trim() || '';
        const score = item.score !== undefined ? `Score: ${item.score}/10` : '';
        const type = item.type || '';
        
        // Calculate text dimensions for page breaking
        const questionNumber = index + 1;
        const questionLines = pdf.splitTextToSize(`Question ${questionNumber}: ${questionText}`, pageWidth);
        const answerLines = answerText ? pdf.splitTextToSize(`Your Answer: ${answerText}`, pageWidth) : [];
        const feedbackLines = feedbackText ? pdf.splitTextToSize(`Feedback: ${feedbackText}`, pageWidth) : [];
        const scoreLines = score ? pdf.splitTextToSize(score, pageWidth) : [];
        
        const questionHeight = questionLines.length * (fontSize * lineHeight) / 2.8;
        const answerHeight = answerLines.length * (fontSize * lineHeight) / 2.8;
        const feedbackHeight = feedbackLines.length * (fontSize * lineHeight) / 2.8;
        const scoreHeight = scoreLines.length * (fontSize * lineHeight) / 2.8;
        const totalHeight = questionHeight + answerHeight + feedbackHeight + scoreHeight + 20; // Add padding
        
        // Add new page if needed
        if (yPosition + totalHeight > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        // Add question
        pdf.setFont('helvetica', 'bold');
        pdf.text(questionLines, margin, yPosition, { maxWidth: pageWidth });
        yPosition += questionHeight + 5;

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
          pdf.setTextColor(0, 100, 0); // Dark green for feedback
          
          // Add score if available
          if (scoreLines.length > 0) {
            pdf.text(scoreLines, margin, yPosition, { maxWidth: pageWidth });
            yPosition += scoreHeight + 2;
          }
          
          pdf.text(feedbackLines, margin, yPosition, { maxWidth: pageWidth });
          yPosition += feedbackHeight + 10; // Extra space after each question
          
          // Reset text color
          pdf.setTextColor(0, 0, 0);
        } else {
          yPosition += 10; // Extra space if no feedback
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
