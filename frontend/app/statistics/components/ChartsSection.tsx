import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  Title,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  ScriptableContext
} from 'chart.js';
import { useMemo, useRef, useEffect } from 'react';
import { PieChart, BarChart2, AlertCircle } from 'lucide-react';
import { StatisticsResponse } from '@/types';

// Register Chart.js components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  Title, 
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler
);

// Chart colors for consistent theming
interface ChartColors {
  hr: string;
  technical: string;
  theory: string;
  practical: string;
  border: string;
  [key: string]: string;
}

const CHART_COLORS: ChartColors = {
  hr: 'rgba(99, 102, 241, 0.8)',
  technical: 'rgba(236, 72, 153, 0.8)',
  theory: 'rgba(16, 185, 129, 0.8)',
  practical: 'rgba(245, 158, 11, 0.8)',
  border: 'rgba(0, 0, 0, 0.1)'
};

// Define chart data type
type LineChartData = ChartData<'line', number[], string>;

interface ChartsSectionProps {
  stats: StatisticsResponse | null;
}

export function ChartsSection({ stats }: ChartsSectionProps) {
  // Log the entire stats object for debugging
  console.log('Stats prop in ChartsSection:', JSON.parse(JSON.stringify(stats || {})));
  
  // Move all hooks to the top, before any conditional returns
  const { metadata } = stats || {};
  
  // Prepare line chart data
  const lineChartData = useMemo<LineChartData>(() => {
    console.log('Preparing line chart data. Raw charts data:', JSON.parse(JSON.stringify(stats?.charts || {})));
    
    if (!stats?.charts?.line_chart) {
      console.log('No line_chart data found in stats.charts');
      return {
        labels: [],
        datasets: []
      };
    }
    
    console.log('Line chart data structure:', {
      labels: stats.charts.line_chart.labels,
      datasets: stats.charts.line_chart.datasets.map(d => ({
        ...d,
        data: d.data,
        label: d.label
      }))
    });

    // Log the datasets
    console.log("Chart dataset preview:", JSON.stringify(stats.charts.line_chart.datasets, null, 2));
    
    // Map the datasets from the API to the format expected by Chart.js
    const datasets = stats.charts.line_chart.datasets.map(dataset => ({
      ...dataset,
      borderWidth: 2,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      backgroundColor: (context: ScriptableContext<'line'>) => {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        if (!chartArea) return 'transparent';
        
        const isHR = dataset.label?.toLowerCase().includes('hr');
        // Extract RGB values from the color
        const color = isHR ? CHART_COLORS.hr : CHART_COLORS.technical;
        const rgb = color.match(/\d+/g)?.map(Number);
        if (!rgb || rgb.length < 3) return color; // Fallback to solid color if parsing fails
        
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        // Start with transparent (alpha 0.1)
        gradient.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.1)`);
        // End with semi-transparent (alpha 0.5)
        gradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.5)`);
        return gradient;
      }
    }));
    
    return {
      labels: stats.charts.line_chart.labels || [],
      datasets
    };
  }, [stats?.charts]);

  // Add refs to track the chart container and instance
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{
    update: (mode?: string) => void;
  } | null>(null);
  
  // Log when the chart data changes
  useEffect(() => {
    console.log('Line chart data updated:', lineChartData);
    if (chartRef.current) {
      console.log('Chart reference available');
    }
  }, [lineChartData]);

  const hasCharts = useMemo(() => {
    console.log('Checking if charts should render:', {
      hasLineData: lineChartData?.datasets?.length > 0,
      hasStats: !!stats,
      hasLineChart: !!stats?.charts?.line_chart,
      lineChartData
    });
    return lineChartData?.datasets?.length > 0 && !!stats?.charts?.line_chart;
  }, [lineChartData, stats]);

  // Update container size on mount and window resize
  useEffect(() => {
    const updateSize = () => {
      if (chartContainerRef.current) {
        const containerSize = {
          width: chartContainerRef.current.offsetWidth,
          height: chartContainerRef.current.offsetHeight
        };
        console.log('Container size updated:', containerSize);
      }
    };

    // Initial size
    updateSize();
    
    // Add resize listener
    window.addEventListener('resize', updateSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle loading or no stats
  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Loading interview data...</h3>
          <p className="mt-1 text-sm text-gray-500">Please wait while we load your statistics.</p>
        </div>
      </div>
    );
  }

  // Handle case when no session data is available
  if (stats.success === false || stats.has_data === false) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="text-center py-8">
          <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No active interview session</h3>
          <p className="mt-1 text-sm text-gray-500">
            {stats.message || 'Please complete an interview to see your statistics.'}
          </p>
          <div className="mt-4">
            <a
              href="/interview-simulator"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Start New Interview
            </a>
          </div>
        </div>
      </div>
    );
  }

  console.log('Chart data:', { lineChartData });

  console.log('Rendering charts with data:', {
    hasLineData: !!lineChartData,
    lineChartData,
    metadata: stats?.metadata
  });

  // Show message when no chart data is available but we have session data
  if (!hasCharts) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <PieChart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Insufficient data for charts</h3>
          <p className="mt-1 text-sm text-gray-500">
            {metadata?.has_hr ? 'HR interview completed. ' : ''}
            {metadata?.has_tech_theory ? 'Technical theory questions answered. ' : ''}
            {metadata?.has_tech_practical ? 'Technical practical questions answered.' : ''}
            {!metadata?.has_tech_theory && !metadata?.has_tech_practical && !metadata?.has_hr 
              ? 'No interview data available.' 
              : 'Complete more questions to see detailed charts.'}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-4 p-4 bg-gray-100 rounded text-left text-xs">
              {JSON.stringify(stats?.metadata, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0 // Disable animations for better debugging
    },
    onResize: (chart, size) => {
      console.log('Chart resized:', { width: size.width, height: size.height });
      // Force update on resize
      chart.update('none');
    },
    // Ensure we have proper interaction
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    // Explicitly set device pixel ratio
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Your Performance',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        min: 0,
        title: {
          display: true,
          text: 'Score (1-10)'
        },
        ticks: {
          stepSize: 1,
          precision: 0
        }
      },
      x: {
        title: {
          display: true,
          text: 'Questions'
        }
      }
    }
  };

  // Log the final chart data and options
  console.log('Rendering charts with:', {
    lineChartData,
    hasCharts,
    chartOptions,
    chartContainer: document.getElementById('chart-container')
  });

  return (
    <div className="space-y-6">
      {/* HR vs Technical Performance Chart */}
      {hasCharts && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Over Time</h3>
          <div 
            ref={chartContainerRef}
            className="h-80 relative"
            id="chart-container"
          >
            <div className="h-full w-full">
              <Line 
                data={lineChartData}
                options={chartOptions}
                ref={(node) => {
                  if (node) {
                    console.log('Chart mounted');
                    // Store the chart reference
                    chartRef.current = node as unknown as { update: (mode?: string) => void };
                    
                    // Force update after a short delay
                    setTimeout(() => {
                      try {
                        if (chartRef.current) {
                          chartRef.current.update('none');
                          console.log('Chart updated');
                        }
                      } catch (e) {
                        console.error('Error updating chart:', e);
                      }
                    }, 100);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Fallback message if no charts are shown but we have data */}
      {!hasCharts && metadata?.total_questions && metadata.total_questions > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <PieChart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Insufficient data for charts</h3>
            <p className="mt-1 text-sm text-gray-500">
              {metadata?.has_hr ? 'HR interview completed. ' : ''}
              {metadata?.has_tech_theory ? 'Technical theory questions answered. ' : ''}
              {metadata?.has_tech_practical ? 'Technical practical questions answered.' : ''}
              {!metadata?.has_tech_theory && !metadata?.has_tech_practical && !metadata?.has_hr 
                ? 'No interview data available.' 
                : 'Complete more questions to see detailed charts.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
