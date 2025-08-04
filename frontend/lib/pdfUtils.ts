import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Options as Html2CanvasOptions } from 'html2canvas/dist/types';

// Extend the Html2CanvasOptions type to include additional properties
type ExtendedHtml2CanvasOptions = Partial<Omit<Html2CanvasOptions, 'onclone'>> & {
  scale?: number;
  width?: number;
  height?: number;
  onclone?: (document: Document, element: HTMLElement) => void;
};

export async function generatePdf(container: HTMLElement, filename: string): Promise<boolean> {
  try {
    // Create a deep clone of the container
    const containerClone = container.cloneNode(true) as HTMLElement;
    
    // Make the clone invisible and add it to the body
    containerClone.style.position = 'absolute';
    containerClone.style.left = '-9999px';
    containerClone.style.top = '0';
    containerClone.style.width = '800px';
    containerClone.style.backgroundColor = '#ffffff';
    containerClone.style.color = '#000000';
    containerClone.style.padding = '20px';
    containerClone.style.boxSizing = 'border-box';
    
    // Remove any existing styles and classes
    containerClone.removeAttribute('style');
    containerClone.removeAttribute('class');
    
    // Process all elements to remove problematic styles and classes
    const processElement = (element: Element) => {
      // Remove all inline styles
      element.removeAttribute('style');
      
      // Remove all classes
      element.removeAttribute('class');
      
      // Process all child elements
      const children = element.children;
      for (let i = 0; i < children.length; i++) {
        processElement(children[i]);
      }
    };
    
    // Process the entire cloned container
    processElement(containerClone);
    
    // Add the clone to the DOM
    document.body.appendChild(containerClone);
    
    // Define html2canvas options with proper typing
    const canvasOptions: ExtendedHtml2CanvasOptions = {
      // Required properties with default values
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      
      // Custom properties
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 800,
      height: containerClone.scrollHeight,
      onclone: (clonedDoc, element) => {
        // Ensure the body has proper styles
        const body = clonedDoc.body;
        body.style.margin = '0';
        body.style.padding = '20px';
        body.style.backgroundColor = '#ffffff';
        body.style.color = '#000000';
        body.style.fontFamily = 'Arial, sans-serif';
        
        // Process all elements to ensure no color styles remain
        const allElements = element.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i] as HTMLElement;
          
          // Remove all inline styles
          el.removeAttribute('style');
          
          // Remove all classes
          el.removeAttribute('class');
          
          // Apply safe styles
          el.style.color = '#000000';
          el.style.backgroundColor = '#ffffff';
          el.style.border = '1px solid #dddddd';
          el.style.margin = '5px 0';
          el.style.padding = '5px';
          
          // Special handling for specific elements
          if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3') {
            el.style.fontWeight = 'bold';
            el.style.margin = '10px 0';
            el.style.fontSize = el.tagName === 'H1' ? '24px' : 
                              el.tagName === 'H2' ? '20px' : '16px';
          }
          
          if (el.tagName === 'P') {
            el.style.margin = '5px 0';
            el.style.lineHeight = '1.5';
          }
        }
      }
    };
    
    // Convert the container to canvas with html2canvas
    // Using type assertion to the extended type
    const canvas = await html2canvas(containerClone, canvasOptions as unknown as Html2CanvasOptions);
    
    // Remove the clone from the DOM
    document.body.removeChild(containerClone);
    
    // Calculate the PDF dimensions
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgWidth = pdfWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: imgHeight > pageHeight ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    
    // Add the image to the PDF
    let heightLeft = imgHeight;
    let position = 10; // Start 10mm from top
    let page = 1;
    
    // Handle multi-page PDFs if content is taller than one page
    while (heightLeft > 0) {
      if (page > 1) {
        pdf.addPage();
        position = 10; // Reset position for new page
      }
      
      pdf.addImage(
        imgData,
        'PNG',
        10, // x position (10mm from left)
        position, // y position
        imgWidth,
        Math.min(imgHeight, pageHeight - 20) // Ensure we don't exceed page height
      );
      
      heightLeft -= (pageHeight - 20); // Subtract page height (with 10mm top and bottom margins)
      position = 10 - (pageHeight - 20) * (page - 1);
      page++;
    }
    
    // Add footer with date and page number
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(0);
      pdf.text(
        `JobMateAI - ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`, 
        pdfWidth / 2, 
        pageHeight - 5, // 5mm from bottom
        { align: 'center' as const }
      );
    }
    
    // Save the PDF
    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}
