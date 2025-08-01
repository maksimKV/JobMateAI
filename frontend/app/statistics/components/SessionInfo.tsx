import { SessionData } from '@/types';

interface SessionInfoProps {
  sessionData: SessionData | null;
}

export function SessionInfo({ sessionData }: SessionInfoProps) {
  if (!sessionData) {
    return (
      <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
        <p className="text-yellow-700">No session information available</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Interview Session</h2>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Session ID:</span> {sessionData.sessionId || 'N/A'}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Date:</span>{' '}
          {sessionData.timestamp ? new Date(sessionData.timestamp).toLocaleString() : 'N/A'}
        </p>
      </div>
    </div>
  );
}
