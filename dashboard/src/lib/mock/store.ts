/**
 * Persistent in-memory state for the demo. Loaded from sessionStorage
 * on first access so a user's edits stick across reloads within a tab.
 *
 * Mutations through mock-fetch go through updateMockState() which
 * persists immediately. Reset clears sessionStorage and reloads the
 * page so every component reads the fresh fixtures again.
 */

import {
  mockSettings,
  mockSchedules,
  mockUserMappings,
  mockScrims,
  mockStrategies,
  mockStrategyFolders,
  mockAbsences,
  mockRecurring,
  mockLogs,
  mockVodComments,
} from './fixtures'

const STORAGE_KEY = 'demo_mock_state_v1'

type Mutable<T> = { -readonly [P in keyof T]: T[P] }

export interface ScheduleDay {
  date: string
  reason: string
  focus: string
  players: { displayName: string; availability: string; role: string; sortOrder: number; userId?: string }[]
}
export interface MockState {
  settings: Mutable<typeof mockSettings>
  userMappings: typeof mockUserMappings.mappings
  schedulesByDate: Record<string, ScheduleDay>
  scrims: typeof mockScrims
  strategies: typeof mockStrategies
  strategyFolders: typeof mockStrategyFolders
  absences: typeof mockAbsences
  recurring: typeof mockRecurring
  logs: typeof mockLogs
  vodCommentsByScrim: Record<string, typeof mockVodComments>
}

let state: MockState | null = null

function freshState(): MockState {
  return {
    settings: structuredClone(mockSettings),
    userMappings: structuredClone(mockUserMappings.mappings),
    schedulesByDate: Object.fromEntries(structuredClone(mockSchedules).map((s) => [s.date, s as ScheduleDay])),
    scrims: structuredClone(mockScrims),
    strategies: structuredClone(mockStrategies),
    strategyFolders: structuredClone(mockStrategyFolders),
    absences: structuredClone(mockAbsences),
    recurring: structuredClone(mockRecurring),
    logs: structuredClone(mockLogs),
    vodCommentsByScrim: mockVodComments.reduce<Record<string, typeof mockVodComments>>((acc, c) => {
      ;(acc[c.scrimId] ||= []).push(c)
      return acc
    }, {}),
  }
}

export function getMockState(): MockState {
  if (state) return state
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) state = JSON.parse(raw) as MockState
  } catch {
    // sessionStorage unavailable (SSR) or corrupted — fall through to fresh.
  }
  if (!state) state = freshState()
  return state
}

function persist() {
  if (!state) return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota exceeded or sandboxed iframe — silently ignore.
  }
}

export function updateMockState(updater: (s: MockState) => void): void {
  const s = getMockState()
  updater(s)
  persist()
}

export function resetMockState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  state = null
}

export function getSchedules(): ScheduleDay[] {
  return Object.values(getMockState().schedulesByDate).sort((a, b) => {
    const pa = a.date.split('.').reverse().join('')
    const pb = b.date.split('.').reverse().join('')
    return pa.localeCompare(pb)
  })
}
