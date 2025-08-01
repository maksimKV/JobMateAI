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
const CHART_COLORS = {
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
      font: { 
        size: 16,
        weight: 'bold' as const
      },
      padding: { top: 10, bottom: 20 }
    },
    tooltip: {
      callbacks: {
        label: function(this: unknown, tooltipItem: TooltipItem<'bar' | 'pie'>) {
          const label = tooltipItem.dataset.label || '';
          const value = tooltipItem.raw as number;
          return `${label}: ${value}%`;
        }
      }
    }
  },
};

interface ChartsSectionProps {
  stats: StatisticsResponse | null;
  hasHRQuestions: boolean;
  hasTechnicalQuestions: boolean;
}

export function ChartsSection({ stats, hasHRQuestions, hasTechnicalQuestions }: ChartsSectionProps) {
  // Process HR vs Technical performance data
  const processHRvsTechnicalData = () => {
    if (!stats?.charts?.bar_chart) {
      return { data: null, options: null };
    }
    
    const barChartData = {
      ...stats.charts.bar_chart,
      datasets: stats.charts.bar_chart.datasets?.map(dataset => ({
        ...dataset,
        backgroundColor: [CHART_COLORS.hr, CHART_COLORS.technical],
        borderColor: CHART_COLORS.border,
        borderWidth: 1
      }))
    };
    
    // Ensure we have valid data
    if (!barChartData.labels || !barChartData.datasets || barChartData.datasets.length === 0) {
      return { data: null, options: null };
    }
    
    const options = {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: {
          ...commonOptions.plugins.title,
          text: barChartData.datasets[0]?.label || 'Interview Performance'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Performance Score (%)'
          }
        }
      }
    };

    return { data: barChartData, options };
  };

  // Process Theory vs Practical performance data
  const processTheoryVsPracticalData = () => {
    if (!stats?.charts?.pie_chart) {
      return { data: null, options: null };
    }

    const pieChartData = {
      ...stats.charts.pie_chart,
      datasets: stats.charts.pie_chart.datasets?.map(dataset => ({
        ...dataset,
        backgroundColor: [CHART_COLORS.theory, CHART_COLORS.practical],
        borderColor: CHART_COLORS.border,
        borderWidth: 1
      }))
    };
    
    // Ensure we have valid data
    if (!pieChartData.labels || !pieChartData.datasets || pieChartData.datasets.length === 0) {
      return { data: null, options: null };
    }

    const options = {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: {
          ...commonOptions.plugins.title,
          text: pieChartData.datasets[0]?.label || 'Performance Breakdown'
        }
      }
    };

    return { data: pieChartData, options };
  };

  const { data: hrVsTechData, options: hrVsTechOptions } = processHRvsTechnicalData();
  const { data: theoryVsPracticalData, options: theoryVsPracticalOptions } = processTheoryVsPracticalData();
  
  // Check if we have valid chart data
  const hasHRData = hasHRQuestions && 
                  hrVsTechData !== null && 
                  hrVsTechOptions !== null;
  
  const hasTechData = hasTechnicalQuestions && 
                    theoryVsPracticalData !== null && 
                    theoryVsPracticalOptions !== null;
  
  // Check if we have any data to show at all
  const hasAnyData = hasHRData || hasTechData;


  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Interview Statistics</h2>
      
      {!hasAnyData ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No interview data available</h3>
          <p className="text-gray-500">
            {hasHRQuestions || hasTechnicalQuestions
              ? "Complete an interview to see your performance metrics."
              : "No interview questions were answered in this session."}
          </p>
        </div>
      ) : (
        <>
          {/* Chart 1: HR vs Technical Performance */}
          {hasHRData && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <BarChart2 className="h-5 w-5 text-indigo-600 mr-2" />
                Interview Type Performance
              </h3>
              <div className="h-80">
                <Bar data={hrVsTechData!} options={hrVsTechOptions!} />
              </div>
            </div>
          )}

          {/* Chart 2: Theory vs Practical Performance */}
          {hasTechData && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <PieChart className="h-5 w-5 text-indigo-600 mr-2" />
                Technical Performance Breakdown
              </h3>
              <div className="h-80">
                <Pie data={theoryVsPracticalData!} options={theoryVsPracticalOptions!} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
