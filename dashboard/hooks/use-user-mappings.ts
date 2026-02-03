'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { BOT_API_URL } from '@/lib/config';

export interface UserMapping {
  discordId: string;
  discordUsername: string;
  displayName: string;
  role: 'MAIN' | 'SUB' | 'COACH';
  sortOrder: number;
  userTimezone?: string | null;
  isAdmin?: boolean;
  avatarUrl?: string | null;
}

// Lowercase role type for form handling
export type RoleType = 'main' | 'sub' | 'coach';

export interface UserMappingCreateData {
  discordId: string;
  discordUsername: string;
  displayName: string;
  role: RoleType;
  timezone?: string | null;
}

export interface UserMappingUpdateData {
  discordId?: string;
  discordUsername?: string;
  displayName?: string;
  role?: RoleType;
  timezone?: string | null;
  isAdmin?: boolean;
}

interface UseUserMappingsOptions {
  fetchOnMount?: boolean;
  requireAuth?: boolean;
}

interface UseUserMappingsResult {
  mappings: UserMapping[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createMapping: (data: UserMappingCreateData) => Promise<UserMapping | null>;
  updateMapping: (discordId: string, data: UserMappingUpdateData) => Promise<UserMapping | null>;
  deleteMapping: (discordId: string) => Promise<boolean>;
  reorderMappings: (orderings: { discordId: string; sortOrder: number }[]) => Promise<boolean>;
  getByDiscordId: (discordId: string) => UserMapping | undefined;
  getByDisplayName: (name: string) => UserMapping | undefined;
  getByRole: (role: 'MAIN' | 'SUB' | 'COACH') => UserMapping[];
}

export function useUserMappings(options: UseUserMappingsOptions = {}): UseUserMappingsResult {
  const { fetchOnMount = true, requireAuth = true } = options;
  const [mappings, setMappings] = useState<UserMapping[]>([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (requireAuth) {
        const data = await apiGet<{ mappings: UserMapping[] }>('/api/user-mappings');
        setMappings(data.mappings || []);
      } else {
        // No auth required (e.g., for login form)
        const response = await fetch(`${BOT_API_URL}/api/user-mappings`);
        if (response.ok) {
          const data = await response.json();
          setMappings(data.mappings || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user mappings');
    } finally {
      setLoading(false);
    }
  }, [requireAuth]);

  useEffect(() => {
    if (fetchOnMount) {
      fetchMappings();
    }
  }, [fetchMappings, fetchOnMount]);

  const createMapping = useCallback(async (data: UserMappingCreateData) => {
    try {
      const result = await apiPost<{ mapping: UserMapping }>('/api/user-mappings', data);
      if (result.mapping) {
        setMappings(prev => [...prev, result.mapping].sort((a, b) => a.sortOrder - b.sortOrder));
        return result.mapping;
      }
      // Refetch if API doesn't return the mapping
      await fetchMappings();
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mapping');
      return null;
    }
  }, [fetchMappings]);

  const updateMapping = useCallback(async (discordId: string, data: UserMappingUpdateData) => {
    try {
      const result = await apiPut<{ mapping: UserMapping }>(`/api/user-mappings/${discordId}`, data);
      if (result.mapping) {
        setMappings(prev => prev.map(m => m.discordId === discordId ? result.mapping : m));
        return result.mapping;
      }
      // Refetch if API doesn't return the mapping
      await fetchMappings();
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mapping');
      return null;
    }
  }, [fetchMappings]);

  const deleteMapping = useCallback(async (discordId: string) => {
    try {
      await apiDelete(`/api/user-mappings/${discordId}`);
      setMappings(prev => prev.filter(m => m.discordId !== discordId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete mapping');
      return false;
    }
  }, []);

  const reorderMappings = useCallback(async (orderings: { discordId: string; sortOrder: number }[]) => {
    // Optimistic update
    setMappings(prev => {
      const updated = prev.map(m => {
        const ordering = orderings.find(o => o.discordId === m.discordId);
        if (ordering) {
          return { ...m, sortOrder: ordering.sortOrder };
        }
        return m;
      });
      return updated.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    try {
      const response = await apiPut<{ success: boolean }>('/api/user-mappings/reorder', { orderings });
      return response.success !== false;
    } catch (err) {
      // Revert on error
      await fetchMappings();
      setError(err instanceof Error ? err.message : 'Failed to reorder mappings');
      return false;
    }
  }, [fetchMappings]);

  const getByDiscordId = useCallback(
    (discordId: string) => mappings.find(m => m.discordId === discordId),
    [mappings]
  );

  const getByDisplayName = useCallback(
    (name: string) => mappings.find(m => m.displayName === name),
    [mappings]
  );

  const getByRole = useCallback(
    (role: 'MAIN' | 'SUB' | 'COACH') => mappings.filter(m => m.role === role),
    [mappings]
  );

  return {
    mappings,
    loading,
    error,
    refetch: fetchMappings,
    createMapping,
    updateMapping,
    deleteMapping,
    reorderMappings,
    getByDiscordId,
    getByDisplayName,
    getByRole,
  };
}
