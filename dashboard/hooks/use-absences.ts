'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export interface Absence {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseAbsencesOptions {
  userId?: string;
  fetchOnMount?: boolean;
}

interface UseAbsencesResult {
  absences: Absence[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createAbsence: (data: { userId: string; startDate: string; endDate: string; reason?: string }) => Promise<Absence | null>;
  updateAbsence: (id: number, data: { startDate?: string; endDate?: string; reason?: string }) => Promise<Absence | null>;
  deleteAbsence: (id: number) => Promise<boolean>;
  isAbsentOnDate: (userId: string, date: string) => boolean;
  getAbsentUserIdsByDates: (dates: string[]) => Promise<Record<string, string[]>>;
}

export function useAbsences(options: UseAbsencesOptions = {}): UseAbsencesResult {
  const { userId, fetchOnMount = true } = options;
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  const fetchAbsences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = userId
        ? `/api/absences?userId=${userId}`
        : '/api/absences/my';
      const data = await apiGet<{ absences: Absence[] }>(endpoint);
      setAbsences(data.absences || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch absences');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (fetchOnMount) {
      fetchAbsences();
    }
  }, [fetchAbsences, fetchOnMount]);

  const createAbsence = useCallback(async (data: { userId: string; startDate: string; endDate: string; reason?: string }) => {
    try {
      const result = await apiPost<{ absence: Absence }>('/api/absences', data);
      if (result.absence) {
        setAbsences(prev => [...prev, result.absence]);
        return result.absence;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create absence');
      return null;
    }
  }, []);

  const updateAbsence = useCallback(async (id: number, data: { startDate?: string; endDate?: string; reason?: string }) => {
    try {
      const result = await apiPut<{ absence: Absence }>(`/api/absences/${id}`, data);
      if (result.absence) {
        setAbsences(prev => prev.map(a => a.id === id ? result.absence : a));
        return result.absence;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update absence');
      return null;
    }
  }, []);

  const deleteAbsence = useCallback(async (id: number) => {
    try {
      await apiDelete(`/api/absences/${id}`);
      setAbsences(prev => prev.filter(a => a.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete absence');
      return false;
    }
  }, []);

  const isAbsentOnDate = useCallback((checkUserId: string, date: string) => {
    return absences.some(a => {
      if (a.userId !== checkUserId) return false;
      // Simple date string comparison (DD.MM.YYYY format)
      return date >= a.startDate && date <= a.endDate;
    });
  }, [absences]);

  const getAbsentUserIdsByDates = useCallback(async (dates: string[]): Promise<Record<string, string[]>> => {
    if (dates.length === 0) return {};
    try {
      const datesParam = dates.join(',');
      const data = await apiGet<{ absentByDate: Record<string, string[]> }>(`/api/absences/by-dates?dates=${datesParam}`);
      return data.absentByDate || {};
    } catch (err) {
      console.error('Failed to fetch absences by dates:', err);
      return {};
    }
  }, []);

  return {
    absences,
    loading,
    error,
    refetch: fetchAbsences,
    createAbsence,
    updateAbsence,
    deleteAbsence,
    isAbsentOnDate,
    getAbsentUserIdsByDates,
  };
}
