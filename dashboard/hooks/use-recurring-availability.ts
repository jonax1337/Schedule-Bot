'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

export interface RecurringAvailability {
  id: number;
  userId: string;
  dayOfWeek: number;
  availability: string;
  active: boolean;
}

interface UseRecurringAvailabilityOptions {
  userId?: string;
  fetchOnMount?: boolean;
}

interface UseRecurringAvailabilityResult {
  recurring: RecurringAvailability[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setRecurring: (day: number, availability: string) => Promise<boolean>;
  setRecurringBulk: (days: number[], availability: string) => Promise<boolean>;
  removeRecurring: (dayOfWeek: number) => Promise<boolean>;
  removeAllRecurring: () => Promise<boolean>;
}

export function useRecurringAvailability(options: UseRecurringAvailabilityOptions = {}): UseRecurringAvailabilityResult {
  const { userId, fetchOnMount = true } = options;
  const [recurring, setRecurringState] = useState<RecurringAvailability[]>([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  const fetchRecurring = useCallback(async () => {
    if (!userId) {
      setRecurringState([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ recurring: RecurringAvailability[] }>(`/api/recurring-availability?userId=${userId}`);
      setRecurringState(data.recurring || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recurring availability');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (fetchOnMount && userId) {
      fetchRecurring();
    }
  }, [fetchRecurring, fetchOnMount, userId]);

  const setRecurring = useCallback(async (dayOfWeek: number, availability: string): Promise<boolean> => {
    try {
      await apiPost<{ success: boolean }>('/api/recurring-availability', {
        dayOfWeek,
        availability,
      });
      await fetchRecurring();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set recurring availability');
      return false;
    }
  }, [fetchRecurring]);

  const setRecurringBulk = useCallback(async (days: number[], availability: string): Promise<boolean> => {
    try {
      await apiPost<{ success: boolean }>('/api/recurring-availability/bulk', { days, availability });
      await fetchRecurring();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set recurring availability');
      return false;
    }
  }, [fetchRecurring]);

  const removeRecurring = useCallback(async (dayOfWeek: number): Promise<boolean> => {
    if (!userId) return false;
    try {
      await apiDelete<{ success: boolean }>(`/api/recurring-availability/${dayOfWeek}?userId=${userId}`);
      await fetchRecurring();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove recurring availability');
      return false;
    }
  }, [userId, fetchRecurring]);

  const removeAllRecurring = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    try {
      await apiDelete<{ success: boolean }>(`/api/recurring-availability?userId=${userId}`);
      await fetchRecurring();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove all recurring availability');
      return false;
    }
  }, [userId, fetchRecurring]);

  return {
    recurring,
    loading,
    error,
    refetch: fetchRecurring,
    setRecurring,
    setRecurringBulk,
    removeRecurring,
    removeAllRecurring,
  };
}
