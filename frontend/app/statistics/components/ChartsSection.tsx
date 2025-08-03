import { Line, Bar } from 'react-chartjs-2';
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
  Filler
} from 'chart.js';
import { useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
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
  nonTechnical: string;
  border: string;
  [key: string]: string;
}

const CHART_COLORS: ChartColors = {
  hr: 'rgba(99, 102, 241, 0.8)',
  technical: 'rgba(236, 72, 153, 0.8)',
  theory: 'rgba(16, 185, 129, 0.8)',
  practical: 'rgba(245, 158, 11, 0.8)',
  nonTechnical: 'rgba(139, 92, 246, 0.8)',
  border: 'rgba(0, 0, 0, 0.1)'
};

interface ChartsSectionProps {
  stats: StatisticsResponse | null;
}

export function ChartsSection({ stats }: ChartsSectionProps) {
  // Prepare bar chart data
  const barChartData = useMemo(() => {
    if (!stats?.scores?.by_category) return null;
    
    const labels = [];
    const data = [];
    const backgroundColors = [];
    const borderColors = [];
    
    // Add HR data if available
    const hrScore = stats.scores.by_category.hr?.average;
    if (hrScore !== undefined && hrScore > 0) {
      labels.push('HR');
      data.push(hrScore);
      backgroundColors.push(CHART_COLORS.hr);
      borderColors.push(CHART_COLORS.hr.replace('0.8', '1'));
    }
    
    // Add Technical data if available (combine theory and practical)
    const techTheory = stats.scores.by_category.tech_theory;
    const techPractical = stats.scores.by_category.tech_practical;
    const techTheoryAvg = techTheory?.average;
    const techPracticalAvg = techPractical?.average;
    
    const hasTechTheory = techTheoryAvg !== undefined && techTheoryAvg > 0;
    const hasTechPractical = techPracticalAvg !== undefined && techPracticalAvg > 0;
    
    if (hasTechTheory || hasTechPractical) {
      let totalScore = 0;
      let totalQuestions = 0;
      
      if (hasTechTheory && techTheory) {
        totalScore += techTheory.average * techTheory.total_questions;
        totalQuestions += techTheory.total_questions;
      }
      
      if (hasTechPractical && techPractical) {
        totalScore += techPractical.average * techPractical.total_questions;
        totalQuestions += techPractical.total_questions;
      }
      
      if (totalQuestions > 0) {
        labels.push('Technical');
        data.push(totalScore / totalQuestions);
        backgroundColors.push(CHART_COLORS.technical);
        borderColors.push(CHART_COLORS.technical.replace('0.8', '1'));
      }
    }
    
    // Add Non-Technical data if available
    const nonTechScore = stats.scores.by_category.non_technical?.average;
    if (nonTechScore !== undefined && nonTechScore > 0) {
      labels.push('Non-Technical');
      data.push(nonTechScore);
      backgroundColors.push(CHART_COLORS.nonTechnical);
      borderColors.push(CHART_COLORS.nonTechnical.replace('0.8', '1'));
    }
    
    if (labels.length === 0) return null;
    
    return {
      labels,
      datasets: [
        {
          label: 'Average Score',
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
          barPercentage: 0.6,
        },
      ],
    };
  }, [stats?.scores]);
  
  // Prepare line chart data
  const lineChartData = useMemo(() => {
    if (!stats?.charts?.line_chart) {
      return null;
    }
    
    const datasets = (stats.charts.line_chart.datasets || []).map(dataset => ({
      ...dataset,
      borderWidth: 2,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.1,
      borderColor: dataset.label?.toLowerCase().includes('hr') 
        ? CHART_COLORS.hr 
        : dataset.label?.toLowerCase().includes('non-technical')
          ? CHART_COLORS.nonTechnical
          : CHART_COLORS.technical,
      backgroundColor: 'transparent',
    }));
    
    return {
      labels: stats.charts.line_chart.labels || [],
      datasets,
    };
  }, [stats?.charts?.line_chart]);
  
  // Check if we have any chart data to show
  const hasChartData = barChartData || lineChartData;
  
  // If no data is available, show a message
  if (!hasChartData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No chart data available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Complete an interview to see your performance statistics.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Bar Chart - Average Scores */}
      {barChartData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Average Scores by Category</h3>
          <div className="h-80">
            <Bar 
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                      display: true,
                      text: 'Average Score (out of 10)'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Question Category'
                    }
                  }
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y.toFixed(2);
                        return `${label}: ${value}`;
                      }
                    }
                  },
                  legend: {
                    display: false
                  }
                }
              }}
            />
          </div>
        </div>
      )}
      
      {/* Line Chart - Performance Over Time */}
      {lineChartData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Over Time</h3>
          <div className="h-80">
            <Line 
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                      display: true,
                      text: 'Score (out of 10)'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Question Number'
                    }
                  }
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        return `${label}: ${value}`;
                      }
                    }
                  },
                  legend: {
                    position: 'top' as const,
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
