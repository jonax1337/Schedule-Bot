"use client"

import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '@/lib/api'

export interface UserMapping {
  discordId: string
  discordUsername: string
  displayName: string
  role: 'MAIN' | 'SUB' | 'COACH'
  sortOrder: number
  userTimezone: string | null
  isAdmin: boolean
  avatarUrl?: string
}

interface UseUserMappingsOptions {
  /** Whether to auto-fetch on mount (default: true) */
  autoFetch?: boolean
}

interface UseUserMappingsReturn {
  mappings: UserMapping[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  /** Get a mapping by Discord ID */
  getByDiscordId: (discordId: string) => UserMapping | undefined
  /** Get mappings by role */
  getByRole: (role: 'MAIN' | 'SUB' | 'COACH') => UserMapping[]
}

/**
 * Custom hook for fetching user mappings
 * Centralizes user mapping fetching logic used across multiple components
 */
export function useUserMappings(options: UseUserMappingsOptions = {}): UseUserMappingsReturn {
  const { autoFetch = true } = options
  const [mappings, setMappings] = useState<UserMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMappings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<UserMapping[]>('/api/user-mappings')
      setMappings(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user mappings'
      setError(message)
      setMappings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoFetch) {
      fetchMappings()
    }
  }, [autoFetch, fetchMappings])

  const getByDiscordId = useCallback(
    (discordId: string) => mappings.find(m => m.discordId === discordId),
    [mappings]
  )

  const getByRole = useCallback(
    (role: 'MAIN' | 'SUB' | 'COACH') => mappings.filter(m => m.role === role),
    [mappings]
  )

  return {
    mappings,
    loading,
    error,
    refresh: fetchMappings,
    getByDiscordId,
    getByRole,
  }
}
