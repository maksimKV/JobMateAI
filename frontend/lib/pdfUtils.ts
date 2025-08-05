import { jsPDF } from 'jspdf';
import { Chart, ChartDataset } from 'chart.js';
import { FeedbackItem } from '@/types';

/**
 * Helper function to enhance chart image with data point overlays
 */
async function enhanceChartImage(chartElement: HTMLCanvasElement): Promise<string> {
  // Create a temporary canvas for drawing
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return chartElement.toDataURL('image/png', 1.0);

  // Get the display scale factor (canvas might be scaled down via CSS)
  const displayScaleX = chartElement.width / chartElement.offsetWidth;
  const displayScaleY = chartElement.height / chartElement.offsetHeight;
  
  console.log('Original chart dimensions:', {
    width: chartElement.width,
    height: chartElement.height,
    clientWidth: chartElement.clientWidth,
    clientHeight: chartElement.clientHeight,
    offsetWidth: chartElement.offsetWidth,
    offsetHeight: chartElement.offsetHeight,
    displayScaleX,
    displayScaleY
  });

  // Double the canvas size for better quality
  const scale = 2;
  tempCanvas.width = chartElement.width * scale;
  tempCanvas.height = chartElement.height * scale;

  // Scale the context for higher resolution
  tempCtx.scale(scale, scale);

  // Draw the original chart at the correct scale
  tempCtx.drawImage(chartElement, 0, 0, chartElement.width, chartElement.height, 0, 0, chartElement.width, chartElement.height);

  // Get the chart instance
  const chart = Chart.getChart(chartElement);
  if (!chart) return tempCanvas.toDataURL('image/png', 1.0);

  const { data } = chart.config;
  const datasets = 'datasets' in data ? data.datasets : [];

  // Configure text styles
  const fontSize = 20;
  const pointRadius = 10;
  tempCtx.font = `bold ${fontSize}px Arial`;
  tempCtx.textAlign = 'center';
  tempCtx.textBaseline = 'middle';

  // Process each dataset
  datasets.forEach((dataset: ChartDataset, datasetIndex: number) => {
    if (!dataset.data || !chart.scales) return;

    // Get the scales
    const meta = chart.getDatasetMeta(datasetIndex);
    const xScale = chart.scales['x'] || chart.scales[meta.xAxisID || ''];
    const yScale = chart.scales['y'] || chart.scales[meta.yAxisID || ''];
    
    if (!xScale || !yScale) {
      console.warn('Missing scales:', { xScale: !!xScale, yScale: !!yScale });
      return;
    }

    // Debug scale information
    console.log('Chart scales:', {
      xScale: {
        type: xScale.type,
        min: xScale.min,
        max: xScale.max,
        width: xScale.width,
        height: xScale.height,
        left: xScale.left,
        right: xScale.right,
        top: xScale.top,
        bottom: xScale.bottom,
      },
      yScale: {
        type: yScale.type,
        min: yScale.min,
        max: yScale.max,
        width: yScale.width,
        height: yScale.height,
        left: yScale.left,
        right: yScale.right,
        top: yScale.top,
        bottom: yScale.bottom,
      },
      meta: {
        data: meta.data?.length,
        xAxisID: meta.xAxisID,
        yAxisID: meta.yAxisID,
      }
    });

    // Process each data point
    dataset.data.forEach((dataPoint, index) => {
      // Skip null or undefined values
      if (dataPoint === null || dataPoint === undefined) return;
      
      // Extract numeric value from different possible data point formats
      // Handle different data point formats
      let value: number | null = null;
      if (typeof dataPoint === 'number') {
        value = dataPoint;
      } else if (dataPoint && typeof dataPoint === 'object' && 'y' in dataPoint) {
        value = (dataPoint as { y: number }).y;
      } else if (Array.isArray(dataPoint) && dataPoint.length > 1) {
        value = dataPoint[1];
      }
      
      if (value === null || typeof value !== 'number') return;

      // Get the raw pixel position from the scale
      let x = xScale.getPixelForValue(index);
      let y = yScale.getPixelForValue(value);
      
      // Adjust for display scaling
      x = x * displayScaleX;
      y = y * displayScaleY;

      // Debug point position
      console.log('Point position:', {
        index,
        value,
        x,
        y,
        inBounds: x >= 0 && y >= 0 && x <= tempCanvas.width && y <= tempCanvas.height,
        canvasWidth: tempCanvas.width,
        canvasHeight: tempCanvas.height,
        scale: scale
      });

      // Skip points outside the chart area
      if (x < 0 || y < 0 || x > tempCanvas.width || y > tempCanvas.height) {
        console.warn('Point outside chart area:', { x, y });
        return;
      }

      // Get border color safely
      const borderColor = Array.isArray(dataset.borderColor) 
        ? dataset.borderColor[dataset.borderColor.length > index ? index : 0]
        : dataset.borderColor;

      // Draw point (size already set above)
      tempCtx.beginPath();
      tempCtx.arc(x, y, pointRadius, 0, Math.PI * 2);
      tempCtx.fillStyle = typeof borderColor === 'string' ? borderColor : '#000';
      tempCtx.fill();
      tempCtx.strokeStyle = '#fff';
      tempCtx.lineWidth = 3;
      tempCtx.stroke();

      // Draw value label
      const label = value.toFixed(1);
      // Position label above the point with more padding for larger text
      const labelY = y - pointRadius - 12; // Increased from 8 to 12
      
      // Draw text background with more padding for larger text
      const textPadding = 8; // Increased from 6 to 8
      const textMetrics = tempCtx.measureText(label);
      const textHeight = fontSize * 1.2; // Dynamic height based on font size
      const textWidth = textMetrics.width;
      const rectX = x - textWidth / 2 - textPadding;
      const rectY = labelY - textHeight / 2 - textPadding / 2;
      
      // Rounded rectangle background
      const cornerRadius = 4;
      tempCtx.beginPath();
      tempCtx.moveTo(rectX + cornerRadius, rectY);
      tempCtx.lineTo(rectX + textWidth + textPadding * 2 - cornerRadius, rectY);
      tempCtx.quadraticCurveTo(
        rectX + textWidth + textPadding * 2, rectY,
        rectX + textWidth + textPadding * 2, rectY + cornerRadius
      );
      tempCtx.lineTo(rectX + textWidth + textPadding * 2, rectY + textHeight + textPadding - cornerRadius);
      tempCtx.quadraticCurveTo(
        rectX + textWidth + textPadding * 2, rectY + textHeight + textPadding,
        rectX + textWidth + textPadding * 2 - cornerRadius, rectY + textHeight + textPadding
      );
      tempCtx.lineTo(rectX + cornerRadius, rectY + textHeight + textPadding);
      tempCtx.quadraticCurveTo(
        rectX, rectY + textHeight + textPadding,
        rectX, rectY + textHeight + textPadding - cornerRadius
      );
      tempCtx.lineTo(rectX, rectY + cornerRadius);
      tempCtx.quadraticCurveTo(
        rectX, rectY,
        rectX + cornerRadius, rectY
      );
      tempCtx.closePath();
      
      tempCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      tempCtx.fill();
      tempCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      tempCtx.stroke();
      
      // Draw text
      tempCtx.fillStyle = '#1a1a1a';
      tempCtx.fillText(label, x, labelY + textPadding / 2);
    });
  });

  return tempCanvas.toDataURL('image/png', 1.0);
}

interface PDFOptions {
  title?: string;
  margin?: number;
  fontSize?: number;
  lineHeight?: number;
  includeCharts?: boolean;
  includeQuestions?: boolean;
  allQuestions?: FeedbackItem[];
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



export async function generatePdf(container: HTMLElement, filename: string, options: PDFOptions = {}): Promise<boolean> {
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
  pdf.text(typeDisplay, x + paddingX, y);
  
  // Restore styles
  pdf.setFontSize(currentFontSize);
  pdf.setTextColor(currentTextColor);
  
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
  const badgeFontSize = baseFontSize * 0.8;
  pdf.setFontSize(badgeFontSize);
  pdf.setFont('helvetica', 'normal');
  
  const textWidth = pdf.getTextWidth(typeDisplay);
  
  // Restore font size
  pdf.setFontSize(currentFontSize);
  
  // Return width with minimal padding (2px on each side)
  return textWidth + 4;
}
