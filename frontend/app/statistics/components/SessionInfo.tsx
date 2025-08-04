import { SessionData } from '@/types';
import { ReactNode } from 'react';

interface SessionInfoProps {
  sessionData: SessionData | null;
  actionButton?: ReactNode;
}

export function SessionInfo({ sessionData, actionButton }: SessionInfoProps) {
  if (!sessionData) {
    return (
      <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
        <p className="text-yellow-700">No session information available</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Interview Session</h2>
        {actionButton}
      </div>
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
