import { useState, useEffect, useCallback } from 'react';

export type BackendStatus = 'checking' | 'starting' | 'ready' | 'error';

interface BackendHealth {
  status: BackendStatus;
  uptime?: number;
  services?: {
    cohere: boolean;
    openai: boolean;
  };
  error?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const HEALTH_CHECK_INTERVAL = 5000; // 5 seconds between retries
const MAX_RETRIES = 120; // 10 minutes total with 5s interval (120 * 5s = 600s = 10min)

export function useBackendHealth() {
  const [status, setStatus] = useState<BackendStatus>('checking');
  const [health, setHealth] = useState<Omit<BackendHealth, 'status'>>({});
  const [retryCount, setRetryCount] = useState(0);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      
      if (response.status === 200) {
        const data = await response.json();
        setStatus('ready');
        setHealth({
          uptime: data.uptime_seconds,
          services: data.services
        });
        return true;
      } else if (response.status === 503) {
        const data = await response.json();
        setStatus('starting');
        setHealth({
          uptime: data.uptime_seconds,
          services: data.services,
          error: data.detail?.message
        });
        return false;
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      console.error('Error checking backend health:', error);
      setStatus('error');
      setHealth({
        error: error instanceof Error ? error.message : 'Failed to connect to backend'
      });
      return false;
    }
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const startHealthCheck = async () => {
      if (retryCount >= MAX_RETRIES) {
        setStatus('error');
        setHealth(prev => ({
          ...prev,
          error: 'Backend is taking too long to start. Please try again later.'
        }));
        return;
      }

      const isHealthy = await checkHealth();
      
      if (!isHealthy && isMounted) {
        setRetryCount(prev => prev + 1);
        timeoutId = setTimeout(startHealthCheck, HEALTH_CHECK_INTERVAL);
      }
    };

    startHealthCheck();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkHealth, retryCount]);

  const resetHealthCheck = useCallback(() => {
    setStatus('checking');
    setRetryCount(0);
    setHealth({});
  }, []);

  return {
    status,
    ...health,
    isReady: status === 'ready',
    isLoading: status === 'checking' || status === 'starting',
    retryCount,
    maxRetries: MAX_RETRIES,
    resetHealthCheck,
    checkHealth
  };
}
