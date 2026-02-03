'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '@/lib/api';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: string;
}

interface UseLogsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  filter?: 'all' | 'info' | 'warn' | 'error' | 'success';
  limit?: number;
}

interface UseLogsResult {
  logs: LogEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLogs(options: UseLogsOptions = {}): UseLogsResult {
  const {
    autoRefresh = false,
    refreshInterval = 5000,
    filter = 'all',
    limit = 100,
  } = options;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const levelParam = filter !== 'all' ? `&level=${filter}` : '';
      const data = await apiGet<LogEntry[]>(`/api/logs?limit=${limit}${levelParam}`);
      setLogs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [filter, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, refreshInterval);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [autoRefresh, refreshInterval, fetchLogs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  };
}
