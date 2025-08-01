import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title, TooltipItem } from 'chart.js';
import { PieChart } from 'lucide-react';
import { StatisticsResponse } from '@/types';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

// Default colors for charts
const CHART_COLORS = {
  background: [
    'rgba(99, 102, 241, 0.8)',
    'rgba(167, 139, 250, 0.8)',
    'rgba(217, 70, 239, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(249, 115, 22, 0.8)',
  ],
  border: [
    'rgba(99, 102, 241, 1)',
    'rgba(167, 139, 250, 1)',
    'rgba(217, 70, 239, 1)',
    'rgba(236, 72, 153, 1)',
    'rgba(249, 115, 22, 1)',
  ]
};

// Chart options for pie chart
const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        pointStyle: 'circle',
        font: {
          size: 12
        }
      }
    },
    title: {
      display: true,
      text: 'Question Type Distribution',
      font: { 
        size: 16,
        weight: 'bold' as const
      },
      padding: {
        top: 10,
        bottom: 20
      }
    },
    tooltip: {
      callbacks: {
        label: function(this: unknown, tooltipItem: TooltipItem<'pie'>) {
          const label = tooltipItem.label || '';
          const value = tooltipItem.raw as number;
          const dataset = tooltipItem.dataset.data as number[];
          const total = dataset.reduce((a, b) => a + b, 0);
          const percentage = Math.round((value / total) * 100);
          return `${label}: ${value} (${percentage}%)`;
        }
      }
    }
  },
};

interface ChartsSectionProps {
  stats: StatisticsResponse | null;
}

export function ChartsSection({ stats }: ChartsSectionProps) {
  // Process chart data from API response
  const processChartData = (data: StatisticsResponse | null) => {
    if (!data?.charts?.pie_chart) {
      return null;
    }

    const pieData = data.charts.pie_chart;
    
    // Ensure we have valid data structure
    if (!pieData.labels || !pieData.datasets || !pieData.datasets[0]?.data) {
      console.error('Invalid chart data structure:', pieData);
      return null;
    }

    // Validate data arrays have the same length
    if (pieData.labels.length !== pieData.datasets[0].data.length) {
      console.error('Mismatch between labels and data length:', {
        labels: pieData.labels,
        data: pieData.datasets[0].data
      });
      return null;
    }

    // Get colors for the current dataset
    const backgroundColors = CHART_COLORS.background.slice(0, pieData.labels.length);
    const borderColors = CHART_COLORS.border.slice(0, pieData.labels.length);

    return {
      labels: pieData.labels,
      datasets: [{
        label: 'Question Types',
        data: pieData.datasets[0].data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
      }],
    };
  };

  const chartData = processChartData(stats);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Performance Metrics</h2>
      
      {/* Pie Chart - Question Types */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <PieChart className="h-5 w-5 text-indigo-600 mr-2" />
          Question Type Distribution
        </h3>
        <div className="h-80">
          {!chartData ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              No chart data available
            </div>
          ) : (
            <div className="relative h-full w-full">
              <Pie
                data={chartData}
                options={{
                  ...pieChartOptions,
                  responsive: true,
                  maintainAspectRatio: false
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
