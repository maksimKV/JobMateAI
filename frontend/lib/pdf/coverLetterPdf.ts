import { jsPDF } from 'jspdf';

interface CoverLetterPdfOptions {
  /**
   * The HTML element containing the cover letter content
   */
  element: HTMLElement;
  
  /**
   * Company name for the filename
   */
  companyName: string;
  
  /**
   * Callback for error handling
   */
  onError?: (error: Error) => void;
  
  /**
   * Callback for successful PDF generation
   */
  onSuccess?: () => void;
}

/**
 * Generates a PDF from a cover letter HTML element
 * @param options - Options for generating the PDF
 * @returns A promise that resolves when the PDF has been generated
 */
export async function generateCoverLetterPdf({
  element,
  companyName,
  onError,
  onSuccess,
}: CoverLetterPdfOptions): Promise<void> {
  try {
    // Create a new PDF document with proper margins
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set document properties
    pdf.setProperties({
      title: `Cover Letter - ${companyName}`,
      subject: 'Cover Letter',
      creator: 'JobMateAI',
      author: 'JobMateAI User'
    });

    // Set default font and size
    pdf.setFont('helvetica');
    pdf.setFontSize(12);
    
    // Get the text content from the element
    const textContent = element.innerText || '';
    const lines = pdf.splitTextToSize(textContent, 180); // 180mm width (A4 width - margins)
    
    // Add content to PDF with proper formatting
    let yPosition = 20; // Start 20mm from top
    const lineHeight = 7; // Line height in mm
    const pageHeight = 277; // A4 height in mm (297 - 20mm margins)
    
    // Add each line of text
    for (let i = 0; i < lines.length; i++) {
      // Add new page if needed (with 20mm bottom margin)
      if (yPosition > pageHeight) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text(lines[i], 15, yPosition);
      yPosition += lineHeight;
    }
        
    // Create a safe filename with the company name
    const safeCompanyName = companyName
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const filename = `Cover Letter - ${safeCompanyName}.pdf`;
    
    // Save the PDF
    pdf.save(filename);
    
    // Call success callback if provided
    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (onError) {
      onError(error instanceof Error ? error : new Error('Failed to generate PDF'));
    }
  }
}
