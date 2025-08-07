import { Chart, ChartDataset } from 'chart.js';

/**
 * Draws a tooltip for donut chart segments
 */
function drawDonutTooltip(
  ctx: CanvasRenderingContext2D,
  segmentX: number,
  segmentY: number,
  label: string,
  value: string,
  color: string,
  centerX: number,
  centerY: number,
  outerRadius: number
) {
  const scale = 1.5;
  const cornerRadius = 8 * scale;
  const textPadding = 8 * scale;
  const lineHeight = 24 * scale;
  const segmentAngle = Math.atan2(segmentY - centerY, segmentX - centerX);
  
  // Set font for measurements
  ctx.font = `bold ${18 * scale}px Arial`;
  
  // Calculate text dimensions with new font
  const labelMetrics = ctx.measureText(label);
  const valueMetrics = ctx.measureText(value);
  const textWidth = Math.max(labelMetrics.width, valueMetrics.width) + (8 * scale);
  const boxWidth = textWidth + textPadding * 2;
  const boxHeight = lineHeight * 2 + textPadding * 1.2;
  
  // Calculate position along segment's angle but further out
  const tooltipDistance = outerRadius * 1.25;
  
  const angleDegrees = (segmentAngle * 180 / Math.PI + 360) % 360;
  const normalizedAngle = angleDegrees > 180 ? angleDegrees - 360 : angleDegrees;

  console.log('Tooltip debug:', {
    segmentAngle,
    degrees: normalizedAngle.toFixed(1) + '°',
    cos: Math.cos(segmentAngle).toFixed(3),
    sin: Math.sin(segmentAngle).toFixed(3),
    label,
    isLeft: normalizedAngle <= -140 || normalizedAngle >= 160,
    isRight: normalizedAngle > -30 && normalizedAngle < 30
  });

  let tooltipX = centerX + Math.cos(segmentAngle) * tooltipDistance;
  let tooltipY = centerY + Math.sin(segmentAngle) * tooltipDistance;

  if (normalizedAngle <= -140 || normalizedAngle >= 160) {
    const adjustFactor = 0.5;
    tooltipX = centerX + Math.cos(segmentAngle) * (tooltipDistance * adjustFactor);
    tooltipY = centerY + Math.sin(segmentAngle) * (tooltipDistance * adjustFactor);
    console.log('Adjusted left tooltip:', { label, adjustFactor });
  } else if (normalizedAngle > -30 && normalizedAngle < 30) {
    tooltipX = centerX + Math.cos(segmentAngle) * tooltipDistance;
    tooltipY = centerY + Math.sin(segmentAngle) * tooltipDistance;
    console.log('Reset right tooltip:', { label });
  }
  
  // Draw tooltip background with shadow
  ctx.save();
  
  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 12 * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4 * scale;
  
  // Background
  ctx.fillStyle = 'white';
  ctx.beginPath();
  roundRect(ctx, tooltipX - boxWidth / 2, tooltipY - boxHeight / 2, boxWidth, boxHeight, cornerRadius);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  
  // Draw text
  ctx.textAlign = 'center';
  
  // Label
  ctx.fillStyle = '#1F2937'; // darker gray for better contrast
  ctx.textBaseline = 'middle';
  ctx.fillText(label, tooltipX, tooltipY - lineHeight * 0.3);
  
  // Value
  ctx.font = `bold ${18 * scale}px Arial`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, tooltipX, tooltipY + lineHeight * 0.9);
  

  
  ctx.restore();
}

/**
 * Utility to draw a rounded rectangle
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Enhances chart image with data point overlays for better PDF export
 */
export async function enhanceChartImage(chartElement: HTMLCanvasElement): Promise<string> {
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

  interface ChartConfig {
    type?: string;
    data: {
      datasets?: Array<{
        data: Array<number | null>;
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        [key: string]: unknown;
      }>;
      labels?: string[];
      [key: string]: unknown;
    };
  }

  const config = chart.config as ChartConfig;
  const { data } = config;
  const datasets = data.datasets || [];
  const labels = 'labels' in data ? data.labels || [] : [];
  
  // Handle donut charts - safely access chart type
  const chartType = config.type;
  if (chartType === 'doughnut' || chartType === 'pie') {
    const centerX = chart.width / 2;
    const centerY = chart.height / 2;
    const outerRadius = Math.min(centerX, centerY) * 0.8;
    
    // Process each dataset
    datasets.forEach((dataset: ChartDataset, datasetIndex: number) => {
      if (!dataset.data || !Array.isArray(dataset.data)) return;
      
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!meta.data || !meta.data.length) return;
      
      // Calculate total for percentages
      const total = dataset.data.reduce((sum: number, val) => {
        return typeof val === 'number' ? sum + val : sum;
      }, 0);
      
      // Draw tooltips for each segment
      // Use Chart.js Element type for arc elements
      interface ChartArc {
        startAngle: number;
        endAngle: number;
        [key: string]: unknown;
      }

      // Type assertion for the arc elements
      const arcElements = meta.data as unknown as ChartArc[];
      arcElements.forEach((arc, index) => {
        const value = dataset.data?.[index];
        if (typeof value !== 'number') return;
        
        // Calculate position on the arc
        const angle = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
        const x = centerX + Math.cos(angle) * outerRadius * 0.8;
        const y = centerY + Math.sin(angle) * outerRadius * 0.8;
        
        // Get label and color
        const label = String(labels[index] || `Segment ${index + 1}`);
        const color = Array.isArray(dataset.backgroundColor) 
          ? dataset.backgroundColor[index % dataset.backgroundColor.length]
          : dataset.backgroundColor || '#000000';
        
        // Calculate percentage
        const percentage = Math.round((value / total) * 100);
        const valueText = `${value.toFixed(1)}/10 (${percentage}%)`;
        
        // Draw tooltip for segments that are large enough
        if (percentage >= 5) {
          drawDonutTooltip(tempCtx, x, y, label, valueText, color, centerX, centerY, outerRadius);
        }
      });
    });
    
    return tempCanvas.toDataURL('image/png', 1.0);
  }

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

    // Process each data point
    dataset.data.forEach((dataPoint, index) => {
      // Skip null or undefined values
      if (dataPoint === null || dataPoint === undefined) return;
      
      // Extract numeric value from different possible data point formats
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

      // Skip points outside the chart area
      if (x < 0 || y < 0 || x > tempCanvas.width || y > tempCanvas.height) {
        console.warn('Point outside chart area:', { x, y });
        return;
      }

      // Get border color safely
      const borderColor = Array.isArray(dataset.borderColor) 
        ? dataset.borderColor[dataset.borderColor.length > index ? index : 0]
        : dataset.borderColor;

      // Draw point
      tempCtx.beginPath();
      tempCtx.arc(x, y, pointRadius, 0, Math.PI * 2);
      tempCtx.fillStyle = typeof borderColor === 'string' ? borderColor : '#000';
      tempCtx.fill();
      tempCtx.strokeStyle = '#fff';
      tempCtx.lineWidth = 3;
      tempCtx.stroke();

      // Draw value label
      const label = value.toFixed(1);
      const labelY = y - pointRadius - 12;
      
      // Draw text background with padding
      const textPadding = 8;
      const textMetrics = tempCtx.measureText(label);
      const textHeight = fontSize * 1.2;
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
