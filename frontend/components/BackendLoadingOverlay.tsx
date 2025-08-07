import { RotateCw, AlertCircle } from 'lucide-react';
import { BackendStatus } from '@/hooks/useBackendHealth';

interface BackendLoadingOverlayProps {
  status: BackendStatus;
  uptime?: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
  onRetry?: () => void;
}

export function BackendLoadingOverlay({
  status,
  uptime,
  error,
  retryCount,
  maxRetries,
  onRetry
}: BackendLoadingOverlayProps) {
  const progress = Math.min(100, Math.round((retryCount / maxRetries) * 100));
  const timeRemaining = Math.max(0, Math.ceil(((maxRetries - retryCount) * 5) / 60));

  if (status === 'ready') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="text-center">
          {status === 'error' ? (
            <div className="text-red-500 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
          ) : (
            <div className="text-blue-600 mb-4">
              <RotateCw className={`h-12 w-12 mx-auto ${status === 'starting' ? 'animate-spin' : ''}`} />
            </div>
          )}
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'checking' && 'Checking Backend...'}
            {status === 'starting' && 'Waking Up Backend...'}
            {status === 'error' && 'Connection Error'}
          </h2>
          
          <p className="text-gray-600 mb-4">
            {status === 'checking' && 'Checking backend server status...'}
            {status === 'starting' && `This might take a minute (${timeRemaining} min remaining)`}
            {status === 'error' && (error || 'Failed to connect to the backend server.')}
          </p>
          
          {(status === 'checking' || status === 'starting') && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          <div className="text-sm text-gray-500 mb-6">
            {status === 'starting' && uptime && (
              <p>Uptime: {Math.round(uptime)} seconds</p>
            )}
            <p>Attempt {retryCount} of {maxRetries}</p>
          </div>
          
          <div className="flex flex-col space-y-2">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={status === 'starting'}
            >
              {status === 'error' ? 'Retry Connection' : 'Refresh Status'}
            </button>
            
            {status === 'error' && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reload Page
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
