import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

type PDFOptions = {
  title?: string;
  margin?: number;
  fontSize?: number;
  lineHeight?: number;
};

export async function generatePdf(container: HTMLElement, filename: string, options: PDFOptions = {}): Promise<boolean> {
  const {
    title = 'Interview Statistics',
    margin = 20,
    fontSize = 12,
    lineHeight = 1.5,
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

    // Process charts/graphics
    const charts = container.querySelectorAll('canvas, img');
    for (const chart of Array.from(charts)) {
      if (chart instanceof HTMLCanvasElement || chart instanceof HTMLImageElement) {
        try {
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
          
          // Add new page if needed (with some margin at the bottom)
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

    // Process questions and answers
    const questions = container.querySelectorAll('.question-container, [data-question]');
    for (const question of Array.from(questions)) {
      // Skip hidden elements
      if (question instanceof HTMLElement && 
          (question.offsetParent === null || 
           window.getComputedStyle(question).display === 'none')) {
        continue;
      }

      // Get question text
      const questionHeader = question.querySelector('h3, h4, .question-text');
      const questionText = questionHeader?.textContent?.trim() || 'Question';
      
      // Get answer if available
      const answerEl = question.querySelector('.answer, [data-answer]');
      const answerText = answerEl?.textContent?.trim() || '';
      
      // Get feedback if available
      const feedbackEl = question.querySelector('.feedback, [data-feedback]');
      const feedbackText = feedbackEl?.textContent?.trim() || '';

      // Calculate total height needed for this question block
      const questionHeight = pdf.getTextDimensions(questionText, { maxWidth: pageWidth }).h * lineHeight;
      const answerHeight = answerText ? pdf.getTextDimensions(answerText, { maxWidth: pageWidth }).h * lineHeight : 0;
      const feedbackHeight = feedbackText ? pdf.getTextDimensions(feedbackText, { maxWidth: pageWidth }).h * lineHeight : 0;
      const totalHeight = questionHeight + answerHeight + feedbackHeight + 15; // Add some padding

      // Add new page if needed
      if (yPosition + totalHeight > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      // Add question
      pdf.setFont('helvetica', 'bold');
      pdf.text(questionText, margin, yPosition, { maxWidth: pageWidth });
      yPosition += questionHeight + 5;

      // Add answer if exists
      if (answerText) {
        pdf.setFont('helvetica', 'normal');
        pdf.text('Your Answer:', margin, yPosition, { maxWidth: pageWidth });
        yPosition += 5;
        
        pdf.text(answerText, margin, yPosition, { maxWidth: pageWidth });
        yPosition += answerHeight + 5;
      }

      // Add feedback if exists
      if (feedbackText) {
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(0, 100, 0); // Dark green for feedback
        pdf.text('Feedback:', margin, yPosition, { maxWidth: pageWidth });
        yPosition += 5;
        
        pdf.text(feedbackText, margin, yPosition, { maxWidth: pageWidth });
        yPosition += feedbackHeight + 10; // Extra space after each question
        pdf.setTextColor(0, 0, 0); // Reset color
      } else {
        yPosition += 10; // Extra space if no feedback
      }
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}
