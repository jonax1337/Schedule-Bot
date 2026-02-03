'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { BOT_API_URL } from '@/lib/config';
import type { Settings } from '@/lib/types';

interface UseSettingsOptions {
  fetchOnMount?: boolean;
  requireAuth?: boolean;
}

interface UseSettingsResult {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>;
  saveSettings: (settings: Settings) => Promise<boolean>;
  updateField: <K extends keyof Settings>(
    section: K,
    field: keyof Settings[K],
    value: Settings[K][keyof Settings[K]]
  ) => void;
}

export function useSettings(options: UseSettingsOptions = {}): UseSettingsResult {
  const { fetchOnMount = true, requireAuth = false } = options;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (requireAuth) {
        const data = await apiGet<Settings>('/api/settings');
        setSettings(data);
      } else {
        // Public endpoint - no auth required
        const response = await fetch(`${BOT_API_URL}/api/settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        } else {
          throw new Error('Failed to fetch settings');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, [requireAuth]);

  useEffect(() => {
    if (fetchOnMount) {
      fetchSettings();
    }
  }, [fetchSettings, fetchOnMount]);

  const saveSettings = useCallback(async (newSettings: Settings): Promise<boolean> => {
    try {
      await apiPost<{ success: boolean }>('/api/settings', newSettings);
      setSettings(newSettings);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      return false;
    }
  }, []);

  const updateField = useCallback(<K extends keyof Settings>(
    section: K,
    field: keyof Settings[K],
    value: Settings[K][keyof Settings[K]]
  ) => {
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };
    });
  }, []);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    setSettings,
    saveSettings,
    updateField,
  };
}
