import { FeedbackItem } from '@/types';

interface QuestionsListProps {
  questions: FeedbackItem[];
  currentPage: number;
  totalPages: number;
  questionType: 'all' | 'hr' | 'technical' | 'non_technical';
  hasHRQuestions: boolean;
  hasTechnicalQuestions: boolean;
  hasNonTechnicalQuestions: boolean;
  onPageChange: (page: number) => void;
  onTypeChange: (type: 'all' | 'hr' | 'technical' | 'non_technical') => void;
}

export function QuestionsList({
  questions,
  currentPage,
  totalPages,
  questionType,
  hasHRQuestions,
  hasTechnicalQuestions,
  hasNonTechnicalQuestions,
  onPageChange,
  onTypeChange,
}: QuestionsListProps) {
  if (!questions.length) {
    return (
      <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
        <p className="text-yellow-700">No feedback available for this session</p>
      </div>
    );
  }

  // Function to get badge color based on question type
  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hr':
        return 'bg-indigo-100 text-indigo-800';
      case 'technical':
      case 'tech_theory':
      case 'tech_practical':
        return 'bg-pink-100 text-pink-800';
      case 'non_technical':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to get display name for question type
  const getTypeDisplayName = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hr':
        return 'HR';
      case 'tech_theory':
        return 'Technical (Theory)';
      case 'tech_practical':
        return 'Technical (Practical)';
      case 'non_technical':
        return 'Non-Technical';
      default:
        return type;
    }
  };

  return (
    <div id="questions-section" className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Interview Questions & Feedback</h2>
        <div className="text-sm text-gray-500">
          Page {currentPage} of {totalPages}
        </div>
      </div>
      
      {/* Question Type Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Question types">
          <button
            onClick={() => onTypeChange('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              questionType === 'all'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Questions
          </button>
          <button
            onClick={() => onTypeChange('hr')}
            disabled={!hasHRQuestions}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              questionType === 'hr'
                ? 'border-indigo-500 text-indigo-600'
                : hasHRQuestions
                ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                : 'border-transparent text-gray-300 cursor-not-allowed'
            }`}
            title={!hasHRQuestions ? 'No HR questions available' : ''}
          >
            HR Questions
          </button>
          <button
            onClick={() => onTypeChange('technical')}
            disabled={!hasTechnicalQuestions}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              questionType === 'technical'
                ? 'border-indigo-500 text-indigo-600'
                : hasTechnicalQuestions
                ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                : 'border-transparent text-gray-300 cursor-not-allowed'
            }`}
            title={!hasTechnicalQuestions ? 'No Technical questions available' : ''}
          >
            Technical Questions
          </button>
          <button
            onClick={() => onTypeChange('non_technical')}
            disabled={!hasNonTechnicalQuestions}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              questionType === 'non_technical'
                ? 'border-indigo-500 text-indigo-600'
                : hasNonTechnicalQuestions
                ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                : 'border-transparent text-gray-300 cursor-not-allowed'
            }`}
            title={!hasNonTechnicalQuestions ? 'No Non-Technical questions available' : ''}
          >
            Non-Technical
          </button>
        </nav>
      </div>
      
      <div className="space-y-6 mb-6">
        {questions.map((item, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900">
                Question {index + 1}: {item.question}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(item.type || '')}`}>
                {getTypeDisplayName(item.type || '')}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              <span className="font-medium">Your Answer:</span> {item.answer}
            </p>
            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-blue-800 mb-1">Feedback</h4>
                {item.score !== undefined && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Score: {item.score}/10
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-line">{item.evaluation}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                  currentPage === pageNum
                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
