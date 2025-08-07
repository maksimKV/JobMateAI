'use client';

import { useBackendHealth } from '@/hooks/useBackendHealth';
import { BackendLoadingOverlay } from '@/components/BackendLoadingOverlay';
import { useEffect } from 'react';

export function BackendProvider({ children }: { children: React.ReactNode }) {
  const {
    status,
    uptime,
    error,
    retryCount,
    maxRetries,
    isReady,
    isLoading,
    checkHealth,
    resetHealthCheck
  } = useBackendHealth();

  // Store the last known good state in localStorage
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    if (isReady) {
      window.localStorage.setItem('backendReady', 'true');
      const timer = setTimeout(() => {
        // Periodically check health when ready
        checkHealth().then(isHealthy => {
          if (!isHealthy) {
            resetHealthCheck();
          }
        });
      }, 60000); // Check every minute
      
      return () => clearTimeout(timer);
    } else {
      window.localStorage.removeItem('backendReady');
    }
  }, [isReady, checkHealth, resetHealthCheck]);

  // Show loading overlay if not ready
  if (!isReady) {
    return (
      <>
        {children}
        <BackendLoadingOverlay
          status={status}
          uptime={uptime}
          error={error}
          retryCount={retryCount}
          maxRetries={maxRetries}
          onRetry={() => {
            resetHealthCheck();
            checkHealth();
          }}
        />
      </>
    );
  }

  return <>{children}</>;
}
