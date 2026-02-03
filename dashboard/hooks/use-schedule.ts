'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import type { ScheduleDay } from '@/lib/types';

interface UseScheduleOptions {
  fetchOnMount?: boolean;
  mode?: 'next14' | 'paginated';
  offset?: number;
}

interface PaginationInfo {
  hasMore: boolean;
  hasNewer: boolean;
  totalPages: number;
  currentPage: number;
}

interface UseScheduleResult {
  schedules: ScheduleDay[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  pagination: PaginationInfo;
  refetch: () => Promise<void>;
  loadPage: (page: number) => Promise<void>;
  loadMultiplePages: (offsets: number[]) => Promise<ScheduleDay[]>;
  updateReason: (date: string, reason: string, focus?: string) => Promise<boolean>;
  updateAvailability: (date: string, userId: string, availability: string) => Promise<boolean>;
}

export function useSchedule(options: UseScheduleOptions = {}): UseScheduleResult {
  const { fetchOnMount = true, mode = 'next14', offset = 0 } = options;
  const [schedules, setSchedules] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationInfo>({
    hasMore: false,
    hasNewer: false,
    totalPages: 1,
    currentPage: offset,
  });

  const fetchSchedulesWithPage = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'paginated') {
        const data = await apiGet<{
          schedules: ScheduleDay[];
          total: number;
          hasMore?: boolean;
          hasNewer?: boolean;
          totalPages?: number;
        }>(`/api/schedule/paginated?offset=${page}`);
        setSchedules(data.schedules || []);
        setTotalCount(data.total || 0);
        setPagination({
          hasMore: data.hasMore ?? false,
          hasNewer: data.hasNewer ?? false,
          totalPages: data.totalPages ?? 1,
          currentPage: page,
        });
      } else {
        const data = await apiGet<{ schedules: ScheduleDay[] }>('/api/schedule/next14');
        setSchedules(data.schedules || []);
        setTotalCount(data.schedules?.length || 0);
        setPagination({
          hasMore: false,
          hasNewer: false,
          totalPages: 1,
          currentPage: 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  const fetchSchedules = useCallback(async () => {
    await fetchSchedulesWithPage(pagination.currentPage);
  }, [fetchSchedulesWithPage, pagination.currentPage]);

  const loadPage = useCallback(async (page: number) => {
    await fetchSchedulesWithPage(page);
  }, [fetchSchedulesWithPage]);

  const loadMultiplePages = useCallback(async (offsets: number[]): Promise<ScheduleDay[]> => {
    try {
      const responses = await Promise.all(
        offsets.map(offset =>
          apiGet<{ schedules: ScheduleDay[] }>(`/api/schedule/paginated?offset=${offset}`)
        )
      );
      return responses.flatMap(r => r.schedules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule pages');
      return [];
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      fetchSchedulesWithPage(offset);
    }
  }, [fetchOnMount, offset, fetchSchedulesWithPage]);

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
    pagination,
    refetch: fetchSchedules,
    loadPage,
    loadMultiplePages,
    updateReason,
    updateAvailability,
  };
}
