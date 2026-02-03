'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { type ScrimEntry, type ScrimStats } from '@/lib/types';
import { parseDDMMYYYY } from '@/lib/date-utils';

// Re-export types for convenience
export type Scrim = ScrimEntry;

interface UseScrimsOptions {
  fetchOnMount?: boolean;
}

type ScrimCreateData = Omit<ScrimEntry, 'id' | 'createdAt' | 'updatedAt'>;
type ScrimUpdateData = Partial<ScrimCreateData>;

interface UseScrimsResult {
  scrims: ScrimEntry[];
  stats: ScrimStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createScrim: (data: ScrimCreateData) => Promise<ScrimEntry | null>;
  updateScrim: (id: string, data: ScrimUpdateData) => Promise<ScrimEntry | null>;
  deleteScrim: (id: string) => Promise<boolean>;
  getById: (id: string) => Promise<ScrimEntry | null>;
}

export function useScrims(options: UseScrimsOptions = {}): UseScrimsResult {
  const { fetchOnMount = true } = options;
  const [scrims, setScrims] = useState<ScrimEntry[]>([]);
  const [stats, setStats] = useState<ScrimStats | null>(null);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  const fetchScrims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ scrims: ScrimEntry[] }>('/api/scrims');
      // Sort by date (newest first)
      const sorted = (data.scrims || []).sort((a, b) => {
        return parseDDMMYYYY(b.date).getTime() - parseDDMMYYYY(a.date).getTime();
      });
      setScrims(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scrims');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiGet<{ stats: ScrimStats }>('/api/scrims/stats/summary');
      setStats(data.stats || null);
    } catch (err) {
      // Stats are optional, don't set error
      console.error('Failed to fetch scrim stats:', err);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      fetchScrims();
      fetchStats();
    }
  }, [fetchScrims, fetchStats, fetchOnMount]);

  const createScrim = useCallback(async (data: ScrimCreateData) => {
    try {
      const result = await apiPost<{ scrim: ScrimEntry }>('/api/scrims', data);
      if (result.scrim) {
        // Re-sort after adding
        setScrims(prev => {
          const updated = [result.scrim, ...prev];
          return updated.sort((a, b) => parseDDMMYYYY(b.date).getTime() - parseDDMMYYYY(a.date).getTime());
        });
        // Refresh stats
        fetchStats();
        return result.scrim;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scrim');
      return null;
    }
  }, [fetchStats]);

  const updateScrim = useCallback(async (id: string, data: ScrimUpdateData) => {
    try {
      const result = await apiPut<{ scrim: ScrimEntry }>(`/api/scrims/${id}`, data);
      if (result.scrim) {
        setScrims(prev => {
          const updated = prev.map(s => s.id === id ? result.scrim : s);
          return updated.sort((a, b) => parseDDMMYYYY(b.date).getTime() - parseDDMMYYYY(a.date).getTime());
        });
        // Refresh stats
        fetchStats();
        return result.scrim;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update scrim');
      return null;
    }
  }, [fetchStats]);

  const deleteScrim = useCallback(async (id: string) => {
    try {
      await apiDelete(`/api/scrims/${id}`);
      setScrims(prev => prev.filter(s => s.id !== id));
      // Refresh stats
      fetchStats();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scrim');
      return false;
    }
  }, [fetchStats]);

  const getById = useCallback(async (id: string): Promise<ScrimEntry | null> => {
    // First check if scrim is already in local state
    const existing = scrims.find(s => s.id === id);
    if (existing) return existing;

    // Otherwise fetch from API
    try {
      const data = await apiGet<{ scrim: ScrimEntry; success: boolean }>(`/api/scrims/${id}`);
      if (data.success && data.scrim) {
        return data.scrim;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch scrim by id:', err);
      return null;
    }
  }, [scrims]);

  return {
    scrims,
    stats,
    loading,
    error,
    refetch: fetchScrims,
    createScrim,
    updateScrim,
    deleteScrim,
    getById,
  };
}
