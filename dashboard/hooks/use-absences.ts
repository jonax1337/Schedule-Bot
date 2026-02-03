"use client"

import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '@/lib/api'

export interface Absence {
  id: number
  userId: string
  startDate: string
  endDate: string
  reason: string
  createdAt: string
  updatedAt: string
}

interface UseAbsencesOptions {
  /** User ID to fetch absences for (if not provided, fetches current user's absences) */
  userId?: string
  /** Whether to auto-fetch on mount (default: true) */
  autoFetch?: boolean
}

interface UseAbsencesReturn {
  absences: Absence[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  /** Check if user is absent on a specific date (DD.MM.YYYY) */
  isAbsentOnDate: (date: string) => boolean
}

/**
 * Parse DD.MM.YYYY date string to Date object
 */
function parseDDMMYYYY(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Custom hook for fetching absence data
 * Centralizes absence fetching logic used across multiple components
 */
export function useAbsences(options: UseAbsencesOptions = {}): UseAbsencesReturn {
  const { userId, autoFetch = true } = options
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAbsences = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = userId ? `/api/absences?userId=${userId}` : '/api/absences/my'
      const data = await apiGet<Absence[]>(endpoint)
      setAbsences(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch absences'
      setError(message)
      setAbsences([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (autoFetch) {
      fetchAbsences()
    }
  }, [autoFetch, fetchAbsences])

  const isAbsentOnDate = useCallback(
    (date: string): boolean => {
      const checkDate = parseDDMMYYYY(date)
      return absences.some(absence => {
        const start = parseDDMMYYYY(absence.startDate)
        const end = parseDDMMYYYY(absence.endDate)
        return checkDate >= start && checkDate <= end
      })
    },
    [absences]
  )

  return {
    absences,
    loading,
    error,
    refresh: fetchAbsences,
    isAbsentOnDate,
  }
}
