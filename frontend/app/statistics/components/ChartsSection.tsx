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

  if (!lineChartData) return null;

  const isMixedInterview = stats?.session?.interview_type?.toLowerCase() === 'mixed';
  const questionCount = isMixedInterview && stats?.session?.feedback?.length
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
                  min: -0.02, // Add small padding at start
                  max: questionCount - 0.98, // Add small padding at end
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
                  // Remove extra padding
                  afterBuildTicks: (axis) => {
                    axis.ticks = Array.from({ length: questionCount }, (_, i) => ({
                      value: i,
                      label: `Q${i + 1}`
                    }));
                  },
                },
              },
              layout: {
                padding: 0, // Remove all padding
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
    </div>
  );
}
