"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiGet } from '@/lib/api'
import type { ScrimEntry, ScrimStats } from '@/lib/types'

interface UseScrimsOptions {
  /** Whether to auto-fetch on mount (default: true) */
  autoFetch?: boolean
  /** Also fetch stats (default: false) */
  fetchStats?: boolean
}

interface UseScrimsReturn {
  scrims: ScrimEntry[]
  stats: ScrimStats | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  /** Filter scrims by map */
  filterByMap: (map: string) => ScrimEntry[]
  /** Filter scrims by opponent */
  filterByOpponent: (opponent: string) => ScrimEntry[]
  /** Filter scrims by result */
  filterByResult: (result: 'win' | 'loss' | 'draw') => ScrimEntry[]
  /** Get unique opponents */
  uniqueOpponents: string[]
  /** Get unique maps */
  uniqueMaps: string[]
}

/**
 * Custom hook for fetching scrim data
 * Centralizes scrim fetching logic used across multiple components
 */
export function useScrims(options: UseScrimsOptions = {}): UseScrimsReturn {
  const { autoFetch = true, fetchStats = false } = options
  const [scrims, setScrims] = useState<ScrimEntry[]>([])
  const [stats, setStats] = useState<ScrimStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScrims = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [scrimsData, statsData] = await Promise.all([
        apiGet<ScrimEntry[]>('/api/scrims'),
        fetchStats ? apiGet<ScrimStats>('/api/scrims/stats/summary') : Promise.resolve(null),
      ])
      setScrims(scrimsData || [])
      setStats(statsData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch scrims'
      setError(message)
      setScrims([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [fetchStats])

  useEffect(() => {
    if (autoFetch) {
      fetchScrims()
    }
  }, [autoFetch, fetchScrims])

  const filterByMap = useCallback(
    (map: string) => scrims.filter(s => s.map === map),
    [scrims]
  )

  const filterByOpponent = useCallback(
    (opponent: string) => scrims.filter(s => s.opponent.toLowerCase().includes(opponent.toLowerCase())),
    [scrims]
  )

  const filterByResult = useCallback(
    (result: 'win' | 'loss' | 'draw') => scrims.filter(s => s.result === result),
    [scrims]
  )

  const uniqueOpponents = useMemo(
    () => [...new Set(scrims.map(s => s.opponent))].sort(),
    [scrims]
  )

  const uniqueMaps = useMemo(
    () => [...new Set(scrims.map(s => s.map).filter(Boolean))].sort(),
    [scrims]
  )

  return {
    scrims,
    stats,
    loading,
    error,
    refresh: fetchScrims,
    filterByMap,
    filterByOpponent,
    filterByResult,
    uniqueOpponents,
    uniqueMaps,
  }
}
