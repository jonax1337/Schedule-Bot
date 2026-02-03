'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

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

interface UseUserMappingsResult {
  mappings: UserMapping[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getByDiscordId: (discordId: string) => UserMapping | undefined;
  getByDisplayName: (name: string) => UserMapping | undefined;
  getByRole: (role: 'MAIN' | 'SUB' | 'COACH') => UserMapping[];
}

export function useUserMappings(): UseUserMappingsResult {
  const [mappings, setMappings] = useState<UserMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ mappings: UserMapping[] }>('/api/user-mappings');
      setMappings(data.mappings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user mappings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMappings();
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
    getByDiscordId,
    getByDisplayName,
    getByRole,
  };
}
