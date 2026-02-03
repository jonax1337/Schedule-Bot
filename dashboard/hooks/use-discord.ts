'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

export interface DiscordChannel {
  id: string;
  name: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: string;
}

export interface DiscordMember {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

interface UseDiscordDataOptions {
  fetchOnMount?: boolean;
}

interface UseDiscordChannelsResult {
  channels: DiscordChannel[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseDiscordRolesResult {
  roles: DiscordRole[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseDiscordMembersResult {
  members: DiscordMember[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDiscordChannels(options: UseDiscordDataOptions = {}): UseDiscordChannelsResult {
  const { fetchOnMount = true } = options;
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<DiscordChannel[]>('/api/discord/channels');
      setChannels(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Discord channels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      fetchChannels();
    }
  }, [fetchChannels, fetchOnMount]);

  return {
    channels,
    loading,
    error,
    refetch: fetchChannels,
  };
}

export function useDiscordRoles(options: UseDiscordDataOptions = {}): UseDiscordRolesResult {
  const { fetchOnMount = true } = options;
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<DiscordRole[]>('/api/discord/roles');
      setRoles(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Discord roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      fetchRoles();
    }
  }, [fetchRoles, fetchOnMount]);

  return {
    roles,
    loading,
    error,
    refetch: fetchRoles,
  };
}

export function useDiscordMembers(options: UseDiscordDataOptions = {}): UseDiscordMembersResult {
  const { fetchOnMount = true } = options;
  const [members, setMembers] = useState<DiscordMember[]>([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ members: DiscordMember[] }>('/api/discord/members');
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Discord members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      fetchMembers();
    }
  }, [fetchMembers, fetchOnMount]);

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
  };
}
