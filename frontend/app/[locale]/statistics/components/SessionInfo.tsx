'use client';

import { SessionData } from '@/types';
import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface SessionInfoProps {
  sessionData: SessionData | null;
  actionButton?: ReactNode;
}

export function SessionInfo({ sessionData, actionButton }: SessionInfoProps) {
  const t = useTranslations('statistics.sessionInfo');
  
  if (!sessionData) {
    return (
      <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
        <p className="text-yellow-700">{t('noSessionInfo')}</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          {t('title')}
        </h2>
        {actionButton}
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">{t('sessionId')}:</span> {sessionData.sessionId || t('notAvailable')}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{t('date')}:</span>{' '}
          {sessionData.timestamp ? new Date(sessionData.timestamp).toLocaleString() : t('notAvailable')}
        </p>
      </div>
    </div>
  );
}
