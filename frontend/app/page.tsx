import Navigation from '@/components/Navigation';
import { 
  FileText, 
  Mail, 
  Search, 
  MessageSquare, 
  BarChart3, 
  Code,
  Upload,
  Sparkles
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Navigation />
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
              Welcome to JobMate AI
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your AI-powered career mentor for job applications, interview preparation, and professional development.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold">CV Analyzer</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Upload your resume and get AI-powered analysis of structure, clarity, and missing sections.
            </p>
            <div className="flex items-center text-sm text-blue-600">
              <Upload className="h-4 w-4 mr-1" />
              Upload PDF or DOCX
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <Mail className="h-8 w-8 text-green-600 mr-3" />
              <h3 className="text-xl font-semibold">Cover Letter Generator</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Generate personalized cover letters in English or Bulgarian based on your CV and job description.
            </p>
            <div className="flex items-center text-sm text-green-600">
              <Sparkles className="h-4 w-4 mr-1" />
              AI-powered personalization
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <Search className="h-8 w-8 text-purple-600 mr-3" />
              <h3 className="text-xl font-semibold">Job Scanner</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Match your skills against job requirements with detailed analysis and match percentages.
            </p>
            <div className="flex items-center text-sm text-purple-600">
              <BarChart3 className="h-4 w-4 mr-1" />
              Skill matching analysis
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <MessageSquare className="h-8 w-8 text-orange-600 mr-3" />
              <h3 className="text-xl font-semibold">Interview Simulator</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Practice HR and technical interviews with AI-generated questions and real-time feedback.
            </p>
            <div className="flex items-center text-sm text-orange-600">
              <Sparkles className="h-4 w-4 mr-1" />
              AI-generated questions
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-8 w-8 text-indigo-600 mr-3" />
              <h3 className="text-xl font-semibold">Statistics Dashboard</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Track your interview performance with interactive charts and detailed analytics.
            </p>
            <div className="flex items-center text-sm text-indigo-600">
              <BarChart3 className="h-4 w-4 mr-1" />
              Performance tracking
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <Code className="h-8 w-8 text-red-600 mr-3" />
              <h3 className="text-xl font-semibold">Code Reviewer</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Get AI feedback on your code with optimization tips, bug detection, and readability improvements.
            </p>
            <div className="flex items-center text-sm text-red-600">
              <Sparkles className="h-4 w-4 mr-1" />
              AI code analysis
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Start by uploading your CV to unlock all features. Your CV will be securely stored and used across all modules.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Upload Your CV
            </button>
            <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
