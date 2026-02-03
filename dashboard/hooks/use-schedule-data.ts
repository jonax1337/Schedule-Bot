"use client"

import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '@/lib/api'
import type { ScheduleDay } from '@/lib/types'

interface UseScheduleDataOptions {
  /** Number of days to fetch (default: 14) */
  days?: number
  /** Whether to auto-fetch on mount (default: true) */
  autoFetch?: boolean
}

interface UseScheduleDataReturn {
  schedules: ScheduleDay[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Custom hook for fetching schedule data
 * Centralizes schedule fetching logic used across multiple components
 */
export function useScheduleData(options: UseScheduleDataOptions = {}): UseScheduleDataReturn {
  const { days = 14, autoFetch = true } = options
  const [schedules, setSchedules] = useState<ScheduleDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<ScheduleDay[]>(`/api/schedule/next${days}`)
      setSchedules(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch schedule'
      setError(message)
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    if (autoFetch) {
      fetchSchedules()
    }
  }, [autoFetch, fetchSchedules])

  return {
    schedules,
    loading,
    error,
    refresh: fetchSchedules,
  }
}
