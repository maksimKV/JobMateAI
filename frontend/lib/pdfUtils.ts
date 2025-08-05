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

  // Set canvas size to match original chart
  tempCanvas.width = chartElement.width;
  tempCanvas.height = chartElement.height;

  // Draw the original chart
  tempCtx.drawImage(chartElement, 0, 0);

  // Get the chart instance
  const chart = Chart.getChart(chartElement);
  if (!chart) return tempCanvas.toDataURL('image/png', 1.0);

  const { data } = chart.config;
  const datasets = 'datasets' in data ? data.datasets : [];

  // Configure text styles
  tempCtx.font = '12px Arial';
  tempCtx.textAlign = 'center';
  tempCtx.textBaseline = 'bottom';

  // Process each dataset
  datasets.forEach((dataset: ChartDataset, datasetIndex: number) => {
    if (!dataset.data || !chart.scales) return;

    // Get the scales
    const xScale = chart.scales['x'] || chart.scales[chart.getDatasetMeta(datasetIndex).xAxisID || ''];
    const yScale = chart.scales['y'] || chart.scales[chart.getDatasetMeta(datasetIndex).yAxisID || ''];
    
    if (!xScale || !yScale) return;

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

      const x = xScale.getPixelForValue(index);
      const y = yScale.getPixelForValue(value);

      // Skip points outside the chart area
      if (x < 0 || y < 0 || x > tempCanvas.width || y > tempCanvas.height) return;

      // Get border color safely
      const borderColor = Array.isArray(dataset.borderColor) 
        ? dataset.borderColor[dataset.borderColor.length > index ? index : 0]
        : dataset.borderColor;

      // Draw point
      tempCtx.beginPath();
      tempCtx.arc(x, y, 5, 0, Math.PI * 2);
      tempCtx.fillStyle = typeof borderColor === 'string' ? borderColor : '#000';
      tempCtx.fill();
      tempCtx.strokeStyle = '#fff';
      tempCtx.lineWidth = 2;
      tempCtx.stroke();

      // Draw value label
      const label = value.toFixed(1);
      const textY = y - 8; // Position above the point
      
      // Draw text background
      const textWidth = tempCtx.measureText(label).width;
      tempCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      tempCtx.fillRect(
        x - textWidth / 2 - 4,
        textY - 12,
        textWidth + 8,
        16
      );
      
      // Draw text
      tempCtx.fillStyle = '#000';
      tempCtx.fillText(label, x, textY);
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
  sessionData: PDFOptions['sessionData'] | null;
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
        
        // Check if this is the pie chart container (contains "Performance by Category")
        const isPieChartContainer = title.includes('Performance by Category');
        
        if (isPieChartContainer) {
          // Handle pie chart container specially
          console.log('Processing pie chart container...');
          const chartContainer = mainContainer.querySelector('.flex.flex-col.md\\:flex-row');
          if (!chartContainer) {
            console.warn('Chart container not found');
            continue;
          }
          
          // Add title with same styling as performance chart
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.text('Performance by Category', margin, yPosition);
          yPosition += 8; // Slightly reduced spacing after title
          
          // Add subtle divider line like in the performance chart
          pdf.setDrawColor(229, 231, 235); // gray-200
          pdf.setLineWidth(0.5);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 12; // Space after divider
          
          // Find the chart canvas
          console.log('Looking for chart canvas...');
          const chartElement = chartContainer.querySelector('canvas');
          if (!chartElement) {
            console.warn('Chart canvas element not found');
            continue;
          }
          console.log('Found chart canvas:', chartElement);
          
          // Calculate dimensions with better space management
          const maxChartSize = 80; // Max size for chart
          const minChartSize = 60; // Min size for chart
          const chartPadding = 10; // Space between chart and panel
          const statsPanelWidth = 60; // Fixed width for stats panel
          
          // Calculate available width for chart with new layout
          const totalAvailableWidth = pageWidth - margin * 2;
          const availableWidth = totalAvailableWidth - statsPanelWidth - chartPadding;
          
          // Ensure chart size is within bounds
          let chartSize = Math.min(maxChartSize, availableWidth);
          chartSize = Math.max(minChartSize, chartSize);
          
          console.log('Chart dimensions:', { 
            totalAvailableWidth,
            availableWidth, 
            chartSize, 
            statsPanelWidth, 
            chartPadding 
          });
          
          // Calculate vertical centering with more space at the top
          const chartY = yPosition + 20; // More top margin for better spacing
          
          try {
            // Wait for the chart to be fully rendered
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Convert canvas to data URL with higher quality
            const dataUrl = chartElement.toDataURL('image/png', 1.0);
            
            // Calculate positions - ensure proper layout
            const chartX = margin;
            const statsPanelX = chartX + chartSize + chartPadding;
            
            console.log('Panel positioning:', { 
              chartX, 
              statsPanelX, 
              chartSize,
              remainingSpace: pageWidth - statsPanelX - margin
            });
            
            // Add chart with fixed aspect ratio
            console.log('Adding chart image to PDF at:', { chartX, chartY, chartSize });
            pdf.addImage(dataUrl, 'PNG', chartX, chartY, chartSize, chartSize);
            
            // Get the actual chart data from the Chart.js instance
            console.log('Getting chart instance and data...');
            const chart = Chart.getChart(chartElement);
            const chartData = chart?.data;
            
            console.log('Chart instance:', chart);
            console.log('Chart data:', JSON.stringify({
              labels: chartData?.labels,
              datasets: chartData?.datasets?.map(d => ({
                label: d.label,
                data: d.data,
                backgroundColor: d.backgroundColor,
                borderColor: d.borderColor
              }))
            }, null, 2));
            
            // Extract category data from the chart if available
            const categoryData: Record<string, { average: number; count: number }> = {};
            
            if (chartData?.datasets?.[0]?.data) {
              console.log('Extracting category data from chart...');
              chartData.labels?.forEach((label, index) => {
                const value = chartData.datasets[0].data[index];
                console.log(`Processing label: ${label}, value: ${value}`);
                if (label && typeof value === 'number') {
                  const category = String(label).toLowerCase();
                  categoryData[category] = {
                    average: value,
                    count: 1 // Default count, adjust if you have actual count data
                  };
                }
              });
              console.log('Extracted category data:', JSON.stringify(categoryData, null, 2));
            } else {
              console.warn('No chart data found in datasets');
            }
            
            // Create a session data object with the extracted or existing data
            const effectiveSessionData = {
              ...(sessionData || {}),
              scores: {
                ...(sessionData?.scores || {}),
                byCategory: {
                  ...(sessionData?.scores?.byCategory || {}),
                  ...categoryData
                },
                overallAverage: sessionData?.scores?.overallAverage || 
                  (Array.isArray(chartData?.datasets?.[0]?.data) 
                    ? (chartData.datasets[0].data as number[]).reduce((a, b) => a + b, 0) / 
                      (chartData.datasets[0].data.length || 1)
                    : 0)
              }
            };
            
            console.log('Effective session data for stats panel:', JSON.stringify(effectiveSessionData, null, 2));
            
            // Position stats panel next to chart
            const safeStartX = Math.max(margin, statsPanelX);
            const safeStartY = chartY;
            const panelWidth = Math.min(statsPanelWidth, pageWidth - safeStartX - margin);
            
            console.log('Rendering stats panel at:', { 
              safeStartX, 
              safeStartY, 
              panelWidth,
              remainingSpace: pageWidth - safeStartX - margin
            });
            
            // Render stats panel with the effective session data
            await renderStatsPanel(pdf, {
              startX: safeStartX,
              startY: safeStartY,
              width: panelWidth,
              allQuestions: allQuestions,
              sessionData: effectiveSessionData,
              fontSize: 9, // Fixed smaller font size
              isPieChartPanel: true
            });
            
            // Update yPosition for next element (use the maximum of chart bottom or stats panel bottom)
            yPosition = Math.max(chartY + chartSize, yPosition) + 30; // More space after section
          } catch (error) {
            console.error('Error processing pie chart:', error);
            yPosition += 20; // Add some space even if chart fails
          }
        } else {
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
          }
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

// Helper function to render the stats panel
async function renderStatsPanel(
  pdf: jsPDF,
  options: RenderStatsPanelOptions
) {
  console.log('Rendering stats panel with options:', JSON.stringify({
    ...options,
    allQuestions: options.allQuestions?.length || 0,
    sessionData: options.sessionData ? 'session data exists' : 'no session data'
  }, null, 2));
  const { startX, startY, width, allQuestions, sessionData, fontSize, isPieChartPanel = false } = options;
  let y = startY;
  
  // Set styles for the stats panel
  pdf.setFont('helvetica', 'normal');
  const panelFontSize = Math.max(fontSize - 1, 9); // Slightly smaller font
  pdf.setFontSize(panelFontSize);
  
  // Section header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(panelFontSize + 1);
  y += 5; // Slight top padding
  
  // Add subtle divider line
  pdf.setDrawColor(229, 231, 235); // gray-200
  pdf.setLineWidth(0.2);
  pdf.line(startX, y, startX + width, y);
  y += 10; // Space after divider
  
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
  const categoryScores: CategoryScore[] = [];
  
  // First, initialize with all categories to ensure they appear even if no data
  filteredCategories.forEach(category => {
    categoryScores.push({
      ...category,
      avgScore: 0,
      count: 0
    });
  });
  
  // Process session data if available
  if (sessionData?.scores?.byCategory) {
    console.log('Category data:', JSON.stringify(sessionData.scores.byCategory, null, 2));
    Object.entries(sessionData.scores.byCategory).forEach(([category, scoreData]) => {
      if (!scoreData) return;
      
      // Normalize category names
      const normalizedCategory = 
        category.toLowerCase() === 'tech_theory' || category.toLowerCase() === 'tech_practical'
          ? 'technical'
          : category.toLowerCase();
      
      // Find the category in our scores
      const existingCategory = categoryScores.find(c => c.id === normalizedCategory);
      
      if (existingCategory) {
        existingCategory.avgScore = scoreData.average || 0;
        existingCategory.count = scoreData.count || 0;
      }
    });
  }
  
  // Fallback to calculating from questions if no session data or missing scores
  if (categoryScores.every(cat => cat.count === 0)) {
    filteredCategories.forEach(category => {
      const categoryQuestions = allQuestions.filter(q => {
        if (!q.type) return false;
        const questionType = q.type.toLowerCase();
        return questionType === category.id.toLowerCase() ||
               (category.id === 'technical' && 
                (questionType === 'tech_theory' || questionType === 'tech_practical'));
      });
      
      if (categoryQuestions.length > 0) {
        const totalScore = categoryQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
        const avgScore = totalScore / categoryQuestions.length;
        
        const existingCategory = categoryScores.find(c => c.id === category.id);
        if (existingCategory) {
          existingCategory.avgScore = Math.round(avgScore * 10) / 10; // Round to 1 decimal place
          existingCategory.count = categoryQuestions.length;
        }
      }
    });
  }
  
  // Filter out categories with no data
  const validScores = categoryScores.filter(cat => cat.count > 0);
  
  // Calculate overall average if we have valid scores
  const hasValidScores = validScores.length > 0;
  const overallAverage = hasValidScores
    ? validScores.reduce((sum, cat) => sum + cat.avgScore, 0) / validScores.length
    : 0;
  
  // If we have valid scores or the pie chart panel, show the data
  if (hasValidScores || isPieChartPanel) {
    // Render each category score
    (isPieChartPanel ? categoryScores : validScores).forEach(category => {
      // Skip non-technical for pie chart panel if needed
      if (isPieChartPanel && category.id === 'non_technical') return;
      
      // Category name with colored bullet
      const bulletRadius = 2.5; // Slightly larger bullet points
      pdf.setFillColor(category.color);
      pdf.circle(startX + bulletRadius, y + bulletRadius, bulletRadius, 'F');
      
      // Category name
      pdf.setFont('helvetica', 'normal');
      pdf.text(category.name, startX + 12, y + 4);
      
      // Score (right-aligned)
      const scoreText = category.count > 0 ? `${category.avgScore.toFixed(1)}/10` : 'N/A';
      const scoreWidth = pdf.getTextWidth(scoreText);
      pdf.text(scoreText, startX + width - scoreWidth, y + 4);
      
      // Only show score bar if we have data
      if (category.count > 0) {
        // Score bar
        const barHeight = 5; // Slightly taller bars
        const barY = y + 7; // Adjusted vertical position
        const barWidth = width * 0.7;
        
        // Background bar
        pdf.setFillColor(229, 231, 235); // gray-200
        pdf.rect(startX, barY, barWidth, barHeight, 'F');
        
        // Filled bar based on score
        const filledWidth = (category.avgScore / 10) * barWidth;
        pdf.setFillColor(category.color);
        pdf.rect(startX, barY, filledWidth, barHeight, 'F');
      }
      
      y += 20; // More vertical space between items
    });
  }
  
  // Add overall average at the bottom if we have valid scores or it's the pie chart panel
  if (hasValidScores || isPieChartPanel) {
    y += 6; // Add some space before the divider
    
    // Divider line
    pdf.setDrawColor(229, 231, 235); // gray-200
    pdf.setLineWidth(0.2);
    pdf.line(startX, y, startX + width, y);
    y += 14; // More space after divider
    
    // Overall average label
    pdf.setFont('helvetica', 'bold');
    pdf.text('Overall Average', startX, y + 4);
    
    // Overall average value
    const overallText = hasValidScores ? `${overallAverage.toFixed(1)}/10` : 'N/A';
    const overallWidth = pdf.getTextWidth(overallText);
    pdf.text(overallText, startX + width - overallWidth, y + 4);
    
    // Overall score bar (only if we have valid data)
    if (hasValidScores) {
      const barHeight = 6; // Slightly taller bar for overall score
      const barY = y + 7;
      const barWidth = width * 0.7;
      
      // Background bar
      pdf.setFillColor(229, 231, 235); // gray-200
      pdf.rect(startX, barY, barWidth, barHeight, 'F');
      
      // Filled bar based on overall score
      const filledWidth = (overallAverage / 10) * barWidth;
      pdf.setFillColor(79, 70, 229); // indigo-600
      pdf.rect(startX, barY, filledWidth, barHeight, 'F');
    }
    
    y += 24; // Space after the overall score
  } else {
    // If no valid scores and not in pie chart panel, show a message
    pdf.setFont('helvetica', 'italic');
    pdf.text('No category data available', startX, y + 4);
    y += 16; // Space after the message
  }
  
  return y; // Return the final y-position
}
