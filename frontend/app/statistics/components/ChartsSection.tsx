import { Pie, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  Title, 
  TooltipItem,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';
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
  BarElement
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

// Common chart options
const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        pointStyle: 'circle',
        font: { size: 12 }
      }
    },
    title: {
      display: true,
      align: 'start' as const,
      font: { size: 16, weight: 'bold' as const },
      padding: { bottom: 20 }
    },
    tooltip: {
      callbacks: {
        label: function(context: TooltipItem<'bar' | 'pie'>) {
          const label = context.dataset?.label || '';
          const value = context.parsed?.y || context.raw || 0;
          const valueToShow = typeof value === 'number' ? value : 0;
          return `${label}: ${valueToShow.toFixed(1)}`;
        }
      }
    }
  },
};

interface ChartsSectionProps {
  stats: StatisticsResponse | null;
}

export function ChartsSection({ stats }: ChartsSectionProps) {
  // Early return if stats is null
  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No interview data available</h3>
          <p className="mt-1 text-sm text-gray-500">Please complete an interview to see your statistics.</p>
        </div>
      </div>
    );
  }

  const { metadata } = stats;
  // Process HR vs Technical performance data
  const processHRvsTechnicalData = () => {
    if (!stats?.charts?.bar_chart) {
      return null;
    }

    const { labels, datasets } = stats.charts.bar_chart;
    
    return {
      labels,
      datasets: datasets.map((dataset, index) => ({
        ...dataset,
        backgroundColor: index === 0 ? CHART_COLORS.hr : CHART_COLORS.technical,
        borderColor: index === 0 ? CHART_COLORS.hr : CHART_COLORS.technical,
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.8,
        categoryPercentage: 0.8,
      }))
    };
  };

  // Process Theory vs Practical performance data
  const processTheoryVsPracticalData = () => {
    if (!stats?.charts?.pie_chart) {
      return null;
    }

    const { labels, datasets } = stats.charts.pie_chart;
    
    return {
      labels,
      datasets: datasets.map(dataset => ({
        ...dataset,
        backgroundColor: [CHART_COLORS.theory, CHART_COLORS.practical],
        borderColor: CHART_COLORS.border,
        borderWidth: 1,
      }))
    };
  };

  const barChartData = processHRvsTechnicalData();
  const pieChartData = processTheoryVsPracticalData();

  // Chart options with type safety
  // Bar chart specific options
  const barChartOptions = {
    ...commonOptions,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    } as const,
    plugins: {
      ...commonOptions.plugins,
      title: {
        ...commonOptions.plugins.title,
        text: 'Interview Performance by Type',
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'bar'>) {
            if (!stats?.scores?.by_category) return '';
            
            const label = context.dataset.label || '';
            const value = context.parsed?.y || 0;
            const category = context.label?.toLowerCase() as keyof typeof stats.scores.by_category;
            const totalQuestions = stats.scores.by_category[category]?.total_questions || 1;
            const average = value / totalQuestions;
            
            return [
              `${label}: ${average.toFixed(1)}/10 avg`,
              `Total: ${value.toFixed(1)}`,
              `Questions: ${totalQuestions}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        title: {
          display: true,
          text: 'Score (out of 10)'
        }
      }
    }
  };

  // Pie chart specific options
  const pieChartOptions = {
    ...commonOptions,
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1000
    } as const,
    plugins: {
      ...commonOptions.plugins,
      title: {
        ...commonOptions.plugins.title,
        text: 'Technical Performance Breakdown',
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'pie'>) {
            const label = context.label || '';
            const value = context.raw as number || 0;
            const dataset = context.dataset as { data: number[] };
            const total = dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            const category = label.toLowerCase().includes('theory') ? 'tech_theory' : 'tech_practical';
            const totalQuestions = stats.scores.by_category[category]?.total_questions || 1;
            const average = value / totalQuestions;
            
            return [
              `${label}: ${average.toFixed(1)}/10 avg`,
              `Percentage: ${percentage}%`,
              `Questions: ${totalQuestions}`
            ];
          }
        }
      }
    }
  };

  // Check if we have any charts to show
  const hasCharts = barChartData || pieChartData;
  const showHRTechnicalChart = barChartData && (metadata.has_hr || metadata.has_technical);
  const showTheoryPracticalChart = pieChartData && metadata.has_tech_theory && metadata.has_tech_practical;

  if (!hasCharts) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="text-center py-8">
          <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No chart data available</h3>
          <p className="mt-1 text-sm text-gray-500">Complete more questions to see your performance charts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HR vs Technical Performance Chart */}
      {showHRTechnicalChart && barChartData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-80">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
      )}

      {/* Theory vs Practical Performance Chart */}
      {showTheoryPracticalChart && pieChartData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-80">
            <Pie data={pieChartData} options={pieChartOptions} />
          </div>
        </div>
      )}

      {/* Fallback message if no charts are shown but we have data */}
      {!showHRTechnicalChart && !showTheoryPracticalChart && metadata.total_questions > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <PieChart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Insufficient data for charts</h3>
            <p className="mt-1 text-sm text-gray-500">
              {metadata.has_hr ? 'HR interview completed. ' : ''}
              {metadata.has_tech_theory ? 'Technical theory questions answered. ' : ''}
              {metadata.has_tech_practical ? 'Technical practical questions answered.' : ''}
              {!metadata.has_tech_theory && !metadata.has_tech_practical && !metadata.has_hr 
                ? 'No interview data available.' 
                : 'Complete more questions to see detailed charts.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
