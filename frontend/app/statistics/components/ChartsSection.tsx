import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip, 
  Legend,
  Filler
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
  Filler
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
  // Calculate the max x-axis value based on whether it's a mixed interview
  const getXAxisMax = useMemo(() => {
    if (!stats?.session?.feedback) return 0;
    const feedback = stats.session.feedback;
    const hasTechnical = feedback.some(item => item.type?.toLowerCase() === 'technical');
    const hasNonTechnical = feedback.some(item => item.type?.toLowerCase() === 'non_technical');
    const isMixedInterview = hasTechnical && hasNonTechnical;
    
    // For mixed interviews, use half the questions, otherwise use all
    const maxValue = isMixedInterview 
      ? Math.ceil(feedback.length / 2) - 1  // -1 because it's 0-based
      : Math.max(0, feedback.length - 1);    // Ensure it's never negative
    
    console.log('X-Axis Max Calculation:', {
      feedbackLength: feedback.length,
      hasTechnical,
      hasNonTechnical,
      isMixedInterview,
      maxValue
    });
    
    return maxValue;
  }, [stats]);

  const xAxisTicks = getXAxisMax + 1;
  console.log('X-Axis Ticks:', xAxisTicks);

  const lineChartData = useMemo(() => {
    if (!stats) {
      console.log('No stats provided for line chart');
      return null;
    }

    if (stats.charts?.line_chart) {
      console.log('Using backend line chart data:', stats.charts.line_chart);
      return stats.charts.line_chart;
    }

    console.log('Processing session data to generate line chart');
    const feedback = stats.session?.feedback || [];
    
    if (!feedback.length) {
      console.log('No feedback data available for line chart');
      return null;
    }

    const isMixedInterview = stats.session?.interview_type?.toLowerCase() === 'mixed';
    console.log('Processing feedback:', {
      totalQuestions: feedback.length,
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
      
      // For mixed interviews, spread the data points out to fill the x-axis
      const chartData = isMixedInterview 
        ? cumulativeAverages.map((value, index) => ({
            x: index * 2, // Spread points out to maintain spacing
            y: value
          }))
        : cumulativeAverages;
      
      return {
        label: `${category} (Avg: ${(data.runningTotal / data.count).toFixed(1)})`,
        data: chartData,
        fill: false,
        borderColor: data.color,
        backgroundColor: data.color + '33',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      };
    });

    if (datasets.length === 0) {
      console.log('No valid line chart data could be generated');
      return null;
    }

    // Generate labels based on the feedback length
    const maxQuestions = isMixedInterview ? Math.ceil(feedback.length / 2) : feedback.length;
    const labels = Array.from({ length: maxQuestions }, (_, i) => `Q${i + 1}`);

    console.log('Generated chart data:', { 
      labels, 
      datasets,
      isMixedInterview,
      xAxisMax: isMixedInterview ? feedback.length - 1 : feedback.length - 1
    });

    return {
      labels,
      datasets,
    };
  }, [stats]);

  if (!lineChartData) {
    return null;
  }

  const isMixedInterview = stats?.session?.interview_type?.toLowerCase() === 'mixed';
  const maxQuestions = isMixedInterview && stats?.session?.feedback?.length 
    ? Math.ceil(stats.session.feedback.length / 2) 
    : stats?.session?.feedback?.length || 0;

  return (
    <div className="space-y-8">
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
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  callbacks: {
                    label: (context) => {
                      const label = context.dataset.label || '';
                      const value = context.parsed.y;
                      return `${label}: ${value}`;
                    }
                  }
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 10,
                  title: {
                    display: true,
                    text: 'Average Score',
                  },
                },
                x: {
                  type: 'linear',
                  title: {
                    display: true,
                    text: 'Question Number',
                  },
                  min: 0,
                  max: isMixedInterview 
                    ? (stats?.session?.feedback?.length || 1) - 1 
                    : Math.max(0, (stats?.session?.feedback?.length || 1) - 1),
                  ticks: {
                    stepSize: 1,
                    callback: isMixedInterview 
                      ? (value) => {
                          // For mixed interviews, show Q1, Q2, etc. at half the interval
                          const qNum = Math.floor(Number(value) / 2) + 1;
                          return qNum <= maxQuestions ? `Q${qNum}` : '';
                        }
                      : undefined,
                    maxTicksLimit: maxQuestions,
                    autoSkip: true,
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
