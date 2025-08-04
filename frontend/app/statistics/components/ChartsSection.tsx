import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip, 
  Legend,
  Filler,
  ArcElement
} from 'chart.js';

// Register only the necessary components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface ScoreCategory {
  score: number;
  total_questions: number;
  average: number;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    barPercentage?: number;
    fill?: boolean;
    tension?: number;
  }>;
}

interface FeedbackItem {
  question: string;
  answer: string;
  evaluation: string;
  type?: string;
  score?: number;
  question_type?: 'hr' | 'technical_theory' | 'technical_practical' | 'non_technical';
}

interface SessionData {
  id: string;
  stage: string;
  interview_type: string;
  timestamp: string;
  questions: string[];
  feedback: FeedbackItem[];
}

interface Scores {
  overall: {
    total: number;
    average: number;
    max_possible: number;
  };
  by_category?: {
    hr?: ScoreCategory;
    tech_theory?: ScoreCategory;
    tech_practical?: ScoreCategory;
    non_technical?: ScoreCategory;
  };
  hr_score?: number;
  tech_theory_score?: number;
  tech_practical_score?: number;
  non_tech_score?: number;
  total_hr?: number;
  total_tech_theory?: number;
  total_tech_practical?: number;
  total_non_tech?: number;
}

interface StatisticsResponse {
  success: boolean;
  has_data?: boolean;
  message?: string;
  error?: string;
  metadata: {
    has_hr: boolean;
    has_technical: boolean;
    has_tech_theory: boolean;
    has_tech_practical: boolean;
    total_questions: number;
  };
  session: SessionData;
  scores: Scores;
  charts?: {
    bar_chart?: ChartData;
    pie_chart?: {
      labels: string[];
      datasets: Array<{
        data: number[];
        backgroundColor: string[];
        borderColor: string[];
        borderWidth: number;
      }>;
    };
    line_chart?: ChartData;
  };
}

interface ChartsSectionProps {
  stats: StatisticsResponse | null;
}

export function ChartsSection({ stats }: ChartsSectionProps) {
  const lineChartData = useMemo(() => {
    if (!stats) return null;
    if (stats.charts?.line_chart) return stats.charts.line_chart;

    const feedback = stats.session?.feedback || [];
    if (!feedback.length) return null;

    const isMixedInterview = stats.session?.interview_type?.toLowerCase() === 'mixed';
    const questionCount = isMixedInterview ? Math.ceil(feedback.length / 2) : feedback.length;

    console.log('Processing feedback:', {
      totalQuestions: feedback.length,
      questionCount,
      interviewType: stats.session?.interview_type,
      isMixedInterview,
    });

    const categoryConfig = {
      hr: { label: 'HR', color: '#4f46e5' },
      technical: { label: 'Technical', color: '#10b981' },
      non_technical: { label: 'Non-Technical', color: '#f59e0b' },
      default: { label: 'Other', color: '#6b7280' }
    };

    const scoresByCategory: Record<string, { 
      scores: number[]; 
      count: number; 
      runningTotal: number;
      color: string;
    }> = {};
    
    feedback.forEach((item) => {
      const type = item.type?.toLowerCase() || 'hr';
      const category = type in categoryConfig 
        ? categoryConfig[type as keyof typeof categoryConfig] 
        : categoryConfig.default;
      
      if (!scoresByCategory[category.label]) {
        scoresByCategory[category.label] = { 
          scores: [], 
          count: 0, 
          runningTotal: 0,
          color: category.color
        };
      }
      
      const score = item.score || 0;
      scoresByCategory[category.label].scores.push(score);
      scoresByCategory[category.label].count++;
      scoresByCategory[category.label].runningTotal += score;
    });
    
    const datasets = Object.entries(scoresByCategory).map(([category, data]) => {
      const cumulativeAverages: number[] = [];
      let runningSum = 0;
      
      data.scores.forEach((score, i) => {
        runningSum += score;
        cumulativeAverages.push(parseFloat((runningSum / (i + 1)).toFixed(2)));
      });
      
      return {
        label: `${category} (Avg: ${(data.runningTotal / data.count).toFixed(1)})`,
        data: isMixedInterview 
          ? cumulativeAverages.map((y, x) => ({ x, y })) // Map to {x, y} points for better control
          : cumulativeAverages,
        fill: false,
        borderColor: data.color,
        backgroundColor: data.color + '33',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      };
    });

    if (datasets.length === 0) return null;

    // Generate labels for all questions
    const labels = Array.from(
      { length: questionCount },
      (_, i) => `Q${i + 1}`
    );

    console.log('Generated chart data:', { 
      labels,
      datasets,
      questionCount,
      feedbackLength: feedback.length
    });

    return { labels, datasets };
  }, [stats]);

  const pieChartData = useMemo(() => {
    if (!stats) return null;
    
    // Calculate scores by category
    const categories = {
      hr: { score: 0, count: 0 },
      technical: { score: 0, count: 0 },
      non_technical: { score: 0, count: 0 }
    };

    // Process feedback to calculate average scores per category
    stats.session?.feedback?.forEach(item => {
      const type = item.type?.toLowerCase() || 'hr';
      const score = item.score || 0;
      
      if (type.includes('hr')) {
        categories.hr.score += score;
        categories.hr.count++;
      } else if (type.includes('tech') || type.includes('technical')) {
        categories.technical.score += score;
        categories.technical.count++;
      } else if (type.includes('non_technical')) {
        categories.non_technical.score += score;
        categories.non_technical.count++;
      }
    });

    // Filter out categories with no questions
    const validCategories = Object.entries(categories)
      .filter(([_, data]) => data.count > 0);

    if (validCategories.length === 0) return null;

    // Prepare chart data
    return {
      labels: validCategories.map(([category]) => 
        category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
      ),
      datasets: [{
        data: validCategories.map(([_, data]) => 
          data.count > 0 ? parseFloat((data.score / data.count).toFixed(1)) : 0
        ),
        backgroundColor: [
          'rgba(79, 70, 229, 0.7)', // HR - indigo
          'rgba(16, 185, 129, 0.7)', // Technical - emerald
          'rgba(245, 158, 11, 0.7)'  // Non-technical - amber
        ],
        borderColor: [
          'rgba(79, 70, 229, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)'
        ],
        borderWidth: 1,
      }]
    };
  }, [stats]);

  if (!lineChartData) return null;

  const isMixedInterview = stats?.session?.interview_type?.toLowerCase() === 'mixed';
  const questionCount = isMixedInterview && stats?.session?.feedback?.length
    ? Math.ceil(stats.session.feedback.length / 2)
    : stats?.session?.feedback?.length || 0;

  return (
    <div className="space-y-8">
      {/* Line Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Over Time</h2>
        <div className="h-80">
          <Line
            data={lineChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { 
                  position: 'top' as const,
                  align: 'end',
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  callbacks: {
                    label: (context) => {
                      const label = context.dataset.label?.split(' (Avg:')?.[0] || '';
                      const value = context.parsed.y;
                      return `${label}: ${value.toFixed(1)}`;
                    }
                  }
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 10,
                  title: { display: true, text: 'Average Score' },
                },
                x: {
                  type: 'linear' as const,
                  title: { display: true, text: 'Question Number' },
                  offset: false,
                  grid: { display: false },
                  min: -0.02,
                  max: questionCount - 0.98,
                  ticks: {
                    stepSize: 1,
                    autoSkip: false,
                    maxRotation: 0,
                    minRotation: 0,
                    callback: (value) => {
                      const index = Number(value);
                      return index >= 0 && index < questionCount ? `Q${index + 1}` : '';
                    },
                  },
                  afterBuildTicks: (axis) => {
                    axis.ticks = Array.from({ length: questionCount }, (_, i) => ({
                      value: i,
                      label: `Q${i + 1}`
                    }));
                  },
                },
              },
              layout: {
                padding: 0,
              },
              elements: {
                point: {
                  radius: 4,
                  hoverRadius: 6,
                },
                line: {
                  tension: 0.3,
                  borderWidth: 2,
                },
              },
            }}
          />
        </div>
      </div>

      {/* Pie Chart */}
      {pieChartData && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance by Category</h2>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Chart Container */}
            <div className="w-full md:w-1/2 h-64">
              <Doughnut
                data={pieChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      align: 'center',
                      labels: {
                        boxWidth: 12,
                        padding: 16,
                        font: {
                          size: 13,
                        },
                        usePointStyle: true,
                        pointStyle: 'circle',
                      },
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      titleFont: {
                        size: 14,
                        weight: 'bold' as const,
                      },
                      bodyFont: {
                        size: 13,
                      },
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.raw as number;
                          return `${label}: ${value.toFixed(1)}/10`;
                        }
                      }
                    },
                  },
                  cutout: '65%',
                  radius: '90%',
                }}
              />
            </div>

            {/* Stats Summary */}
            <div className="w-full md:w-1/2 space-y-4">
              {pieChartData.labels.map((label, index) => {
                const score = pieChartData.datasets[0].data[index] as number;
                const color = pieChartData.datasets[0].backgroundColor?.[index] || '#6b7280';
                
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <span 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-gray-700">{label}</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {score.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{
                          width: `${(score / 10) * 100}%`,
                          backgroundColor: color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4 mt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Overall Average</span>
                  <span className="text-sm font-semibold text-indigo-600">
                    {(
                      (pieChartData.datasets[0].data as number[]).reduce((a, b) => a + b, 0) / 
                      pieChartData.datasets[0].data.length
                    ).toFixed(1)}/10
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
