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
  };
}

interface CategoryScore {
  id: string;
  name: string;
  color: string;
  avgScore: number;
  count: number;
}

interface RenderStatsPanelOptions {
  startX: number;
  startY: number;
  width: number;
  allQuestions: FeedbackItem[];
  sessionData: PDFOptions['sessionData'];
  fontSize: number;
  isPieChartPanel?: boolean;
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
    sessionData = null
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
        
        // Check if this is the pie chart container (contains "Performance by Category")
        const isPieChartContainer = title.includes('Performance by Category');
        
        if (isPieChartContainer) {
          // Handle pie chart container specially
          const chartContainer = mainContainer.querySelector('.flex.flex-col.md\\:flex-row');
          if (!chartContainer) continue;
          
          // Add title
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.text(title, margin, yPosition);
          yPosition += 10;
          
          // Find the chart canvas
          const chartElement = chartContainer.querySelector('canvas');
          if (!chartElement) continue;
          
          // Calculate dimensions
          const chartHeight = 200;
          const chartWidth = chartHeight * 1.2;
          
          try {
            // Convert canvas to data URL
            const dataUrl = chartElement.toDataURL('image/png', 1.0);
            
            // Add the chart image
            pdf.addImage(dataUrl, 'PNG', margin, yPosition, chartWidth, chartHeight);
            
            // Add stats panel to the right
            if (sessionData) {
              const statsPanelWidth = pageWidth - chartWidth - margin - 20;
              
              await renderStatsPanel(pdf, {
                startX: margin + chartWidth + 20,
                startY: yPosition,
                width: statsPanelWidth,
                allQuestions: allQuestions,
                sessionData: sessionData,
                fontSize: fontSize,
                isPieChartPanel: true
              });
            }
            
            yPosition += chartHeight + 30; // Add space after the chart row
          } catch (error) {
            console.error('Error processing pie chart:', error);
          }
          
        } else {
          // Handle regular charts (line chart)
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
            // Convert canvas to data URL
            const dataUrl = chartElement.toDataURL('image/png', 1.0);
            
            // Add the chart image
            pdf.addImage(dataUrl, 'PNG', margin, yPosition, chartWidth, chartHeight);
            
            yPosition += chartHeight + 30; // Add space after the chart
          } catch (error) {
            console.error('Error processing chart:', error);
          }
        }
      }
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

// Helper function to render the stats panel
async function renderStatsPanel(
  pdf: jsPDF,
  options: RenderStatsPanelOptions
) {
  const { startX, startY, width, allQuestions, sessionData, fontSize, isPieChartPanel = false } = options;
  let y = startY;
  
  // Set styles for the stats panel
  pdf.setFont('helvetica', 'normal');
  const panelFontSize = Math.max(fontSize - 2, 10);
  pdf.setFontSize(panelFontSize);
  
  // Add section header with background
  pdf.setFillColor(249, 250, 251); // gray-50
  pdf.roundedRect(startX - 2, y - 4, width + 4, 24, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.text('Performance by Category', startX + 4, y + 6);
  y += 16;
  
  // Add divider line
  pdf.setDrawColor(209, 213, 219); // gray-300
  pdf.setLineWidth(0.3);
  pdf.line(startX, y, startX + width, y);
  y += 8;
  
  // Define category colors and display names
  const categories = [
    { id: 'hr', name: 'HR', color: '#4F46E5' },
    { id: 'technical', name: 'Technical', color: '#10B981' },
    { id: 'non_technical', name: 'Non-Technical', color: '#F59E0B' }
  ];
  
  // Filter categories for pie chart panel
  const filteredCategories = isPieChartPanel 
    ? categories.filter(cat => cat.id !== 'non_technical')
    : categories;
  
  // Get scores from sessionData if available, otherwise calculate from questions
  let categoryScores: CategoryScore[] = [];
  
  if (sessionData?.scores?.byCategory) {
    // Use scores from session data if available
    categoryScores = Object.entries(sessionData.scores.byCategory)
      .filter(([category]) => 
        isPieChartPanel 
          ? ['hr', 'technical', 'tech_theory', 'tech_practical'].includes(category.toLowerCase())
          : true
      )
      .map(([category, scoreData]) => {
        // Combine tech_theory and tech_practical into Technical
        const normalizedCategory = 
          category.toLowerCase() === 'tech_theory' || category.toLowerCase() === 'tech_practical'
            ? 'technical'
            : category.toLowerCase();
            
        const categoryInfo = filteredCategories.find(c => c.id === normalizedCategory) || 
                           { id: normalizedCategory, name: normalizedCategory, color: '#6B7280' };
        return {
          ...categoryInfo,
          avgScore: scoreData.average || 0,
          count: scoreData.count || 0
        };
      });
      
    // Combine scores for technical categories
    if (isPieChartPanel) {
      const technicalScores = categoryScores.filter(cat => 
        ['technical', 'tech_theory', 'tech_practical'].includes(cat.id)
      );
      
      if (technicalScores.length > 1) {
        const combinedTechnical = {
          id: 'technical',
          name: 'Technical',
          color: '#10B981',
          avgScore: technicalScores.reduce((sum, cat) => sum + (cat.avgScore * (cat.count || 1)), 0) / 
                   technicalScores.reduce((sum, cat) => sum + (cat.count || 1), 0) || 0,
          count: technicalScores.reduce((sum, cat) => sum + (cat.count || 0), 0)
        };
        
        // Remove individual technical categories and add combined one
        categoryScores = [
          ...categoryScores.filter(cat => !['technical', 'tech_theory', 'tech_practical'].includes(cat.id)),
          combinedTechnical
        ];
      }
    }
  } else {
    // Fallback to calculating from questions
    categoryScores = filteredCategories
      .map(category => {
        const categoryQuestions = allQuestions.filter(q => 
          q.type?.toLowerCase() === category.id.toLowerCase() ||
          (category.id === 'technical' && 
           ['technical', 'tech_theory', 'tech_practical'].includes(q.type?.toLowerCase() || ''))
        );
        
        const categoryScore = categoryQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
        const avgScore = categoryQuestions.length > 0 ? categoryScore / categoryQuestions.length : 0;
        
        return {
          ...category,
          count: categoryQuestions.length,
          avgScore: Math.round(avgScore * 10) / 10 // Round to 1 decimal place
        };
      })
      .filter(cat => cat.count > 0); // Only show categories with questions
  }
  
  // Add some spacing if there are no category scores
  if (categoryScores.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.text('No category data available', startX, y);
    y += 8;
  } else {
    // Render each category
    for (const category of categoryScores) {
      // Skip non-technical for pie chart panel
      if (isPieChartPanel && category.id === 'non_technical') continue;
      
      // Add color indicator
      pdf.setFillColor(category.color);
      pdf.circle(startX, y - 2, 3, 'F');
      
      // Add category name
      pdf.setFont('helvetica', 'normal');
      pdf.text(category.name, startX + 8, y);
      
      // Add score
      const scoreText = `${category.avgScore.toFixed(1)}/10`;
      const scoreWidth = pdf.getTextWidth(scoreText);
      pdf.text(scoreText, startX + width - scoreWidth, y);
      
      // Add progress bar
      const progressWidth = width * 0.7;
      const progressPercent = Math.min(100, (category.avgScore / 10) * 100);
      
      // Progress bar background
      pdf.setDrawColor(229, 231, 235); // gray-200
      pdf.setFillColor(229, 231, 235);
      pdf.roundedRect(startX, y + 4, progressWidth, 4, 2, 2, 'F');
      
      // Progress bar fill
      pdf.setFillColor(category.color);
      pdf.roundedRect(startX, y + 4, (progressWidth * progressPercent) / 100, 4, 2, 2, 'F');
      
      y += 16; // Space between items
    }
  }
  
  // Add overall average if not in pie chart panel
  if (!isPieChartPanel) {
    // Add divider line
    y += 4;
    pdf.setDrawColor(209, 213, 219);
    pdf.setLineWidth(0.3);
    pdf.line(startX, y, startX + width, y);
    y += 8;
    
    // Add overall average
    const totalQuestions = allQuestions.length;
    const totalScore = allQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
    const overallAvg = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 10) / 10 : 0;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Overall Average', startX, y);
    
    const avgText = `${overallAvg.toFixed(1)}/10`;
    const avgWidth = pdf.getTextWidth(avgText);
    pdf.text(avgText, startX + width - avgWidth, y);
    
    // Overall progress bar
    const progressWidth = width * 0.7;
    const progressPercent = Math.min(100, (overallAvg / 10) * 100);
    
    // Progress bar background
    pdf.setDrawColor(229, 231, 235);
    pdf.setFillColor(229, 231, 235);
    pdf.roundedRect(startX, y + 6, progressWidth, 6, 3, 3, 'F');
    
    // Progress bar fill
    pdf.setFillColor(79, 70, 229); // indigo-600
    pdf.roundedRect(startX, y + 6, (progressWidth * progressPercent) / 100, 6, 3, 3, 'F');
  }
  
  return y;
}
