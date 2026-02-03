'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BOT_API_URL } from '@/lib/config';

export interface BotStatus {
  status: 'running' | 'offline';
  botReady: boolean;
  uptime?: number;
}

interface UseBotStatusOptions {
  fetchOnMount?: boolean;
  pollInterval?: number; // in milliseconds, 0 to disable polling
}

interface UseBotStatusResult {
  botStatus: BotStatus | null;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  formattedUptime: string;
  refetch: () => Promise<void>;
}

export function useBotStatus(options: UseBotStatusOptions = {}): UseBotStatusResult {
  const { fetchOnMount = true, pollInterval = 0 } = options;
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/api/bot-status`);
      if (response.ok) {
        const data = await response.json();
        setBotStatus(data);
        setError(null);
      } else {
        setBotStatus({ status: 'offline', botReady: false });
        setError('Failed to fetch bot status');
      }
    } catch {
      setBotStatus({ status: 'offline', botReady: false });
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      fetchStatus();
    }

    // Set up polling if enabled
    if (pollInterval > 0) {
      intervalRef.current = setInterval(fetchStatus, pollInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStatus, fetchOnMount, pollInterval]);

  const isOnline = botStatus?.status === 'running' && botStatus?.botReady;

  const formatUptime = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return {
    botStatus,
    loading,
    error,
    isOnline,
    formattedUptime: formatUptime(botStatus?.uptime),
    refetch: fetchStatus,
  };
}
