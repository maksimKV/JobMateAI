import { Chart, ChartDataset } from 'chart.js';

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
