'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import type { ScheduleDay } from '@/lib/types';

interface UseScheduleOptions {
  fetchOnMount?: boolean;
  mode?: 'next14' | 'paginated';
  offset?: number;
}

interface UseScheduleResult {
  schedules: ScheduleDay[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  updateReason: (date: string, reason: string, focus?: string) => Promise<boolean>;
  updateAvailability: (date: string, userId: string, availability: string) => Promise<boolean>;
}

export function useSchedule(options: UseScheduleOptions = {}): UseScheduleResult {
  const { fetchOnMount = true, mode = 'next14', offset = 0 } = options;
  const [schedules, setSchedules] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'paginated') {
        const data = await apiGet<{ schedules: ScheduleDay[]; total: number }>(`/api/schedule/paginated?offset=${offset}`);
        setSchedules(data.schedules || []);
        setTotalCount(data.total || 0);
      } else {
        const data = await apiGet<{ schedules: ScheduleDay[] }>('/api/schedule/next14');
        setSchedules(data.schedules || []);
        setTotalCount(data.schedules?.length || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  }, [mode, offset]);

  useEffect(() => {
    if (fetchOnMount) {
      fetchSchedules();
    }
  }, [fetchSchedules, fetchOnMount]);

  const updateReason = useCallback(async (date: string, reason: string, focus?: string): Promise<boolean> => {
    try {
      await apiPost<{ success: boolean }>('/api/schedule/update-reason', { date, reason, focus });
      // Update local state
      setSchedules(prev => prev.map(s =>
        s.date === date ? { ...s, reason, focus: focus ?? s.focus } : s
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reason');
      return false;
    }
  }, []);

  const updateAvailability = useCallback(async (date: string, userId: string, availability: string): Promise<boolean> => {
    try {
      await apiPost<{ success: boolean }>('/api/schedule/update-availability', { date, userId, availability });
      // Refetch to get updated data
      await fetchSchedules();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update availability');
      return false;
    }
  }, [fetchSchedules]);

  return {
    schedules,
    loading,
    error,
    totalCount,
    refetch: fetchSchedules,
    updateReason,
    updateAvailability,
  };
}
