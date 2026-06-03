/**
 * Globally intercepts window.fetch in dev mode. Any request whose URL
 * contains "/api/" gets matched against the routes below and answered
 * with mock data; anything else falls through to the real fetch.
 *
 * Match order matters — first hit wins. Patterns can be string-equality
 * (just the path, e.g. '/api/settings') or a RegExp (e.g. /\/api\/scrims\/[^/]+$/).
 */

import {
  mockSettings,
  mockUserMappings,
  mockSchedules,
  mockScrims,
  mockScrimStats,
  mockStrategies,
  mockStrategyFolders,
  mockAbsences,
  mockRecurring,
  mockLogs,
  mockDiscordChannels,
  mockDiscordRoles,
  mockBotStatus,
  mockVodComments,
} from './fixtures'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface MockContext {
  url: URL
  method: Method
  body: unknown
  match: RegExpMatchArray | null
}

type MockHandler = (ctx: MockContext) => unknown | Promise<unknown>

interface MockRoute {
  method: Method | Method[]
  match: string | RegExp
  handler: MockHandler
}

const today = mockSchedules.find((s) => {
  const [d, m, y] = s.date.split('.').map(Number)
  const today = new Date()
  return d === today.getDate() && m === today.getMonth() + 1 && y === today.getFullYear()
}) ?? mockSchedules[2]

const ok = <T>(data: T) => data
const success = () => ({ success: true })

const routes: MockRoute[] = [
  // Settings & branding
  { method: 'GET', match: '/api/settings', handler: () => ok(mockSettings) },
  { method: 'POST', match: '/api/settings', handler: success },

  // User mappings (full list + admin CRUD)
  { method: 'GET', match: '/api/user-mappings', handler: () => ok(mockUserMappings) },
  { method: ['POST', 'PUT', 'DELETE'], match: /\/api\/user-mappings/, handler: success },

  // Auth — all bypassed in dev mode but stub the validateToken path
  { method: 'GET', match: '/api/auth/user', handler: () => ({ username: 'dev-admin', role: 'admin' }) },
  { method: 'POST', match: '/api/admin/login', handler: () => ({ success: true, token: 'dev-fake-jwt', user: { username: 'dev-admin', role: 'admin' } }) },
  { method: 'POST', match: '/api/user/login', handler: ({ body }) => ({ success: true, token: 'dev-fake-jwt', user: { username: (body as { username?: string })?.username ?? 'Phoenix', role: 'user' } }) },
  { method: 'GET', match: '/api/auth/discord', handler: () => ({ url: '#dev-mode-discord-oauth-disabled' }) },
  { method: 'GET', match: /\/api\/auth\/discord\/callback/, handler: () => ({ token: 'dev-fake-jwt', user: { username: 'Phoenix', role: 'user' } }) },

  // Schedule
  { method: 'GET', match: '/api/schedule/today', handler: () => ok(today) },
  { method: 'GET', match: '/api/schedule/week', handler: () => ok({ days: mockSchedules.slice(0, 7) }) },
  { method: 'GET', match: '/api/schedule/next14', handler: () => ok(mockSchedules) },
  { method: 'GET', match: '/api/schedule/month', handler: () => ok(mockSchedules) },
  { method: 'GET', match: /\/api\/schedule\/range/, handler: () => ok({ days: mockSchedules }) },
  { method: 'GET', match: /\/api\/schedule\/[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/, handler: ({ url }) => {
    const date = url.pathname.split('/').pop()!
    return ok(mockSchedules.find((s) => s.date === date) ?? { date, reason: '', focus: '', players: [] })
  } },
  { method: ['POST', 'PUT', 'DELETE', 'PATCH'], match: /\/api\/schedule/, handler: success },

  // Scrims & stats
  { method: 'GET', match: '/api/scrims', handler: () => ok({ scrims: mockScrims }) },
  { method: 'GET', match: /\/api\/scrims\/stats/, handler: () => ok(mockScrimStats) },
  { method: 'GET', match: '/api/scrim-stats', handler: () => ok(mockScrimStats) },
  { method: 'GET', match: /\/api\/scrims\/[^/]+$/, handler: ({ url }) => {
    const id = url.pathname.split('/').pop()
    return ok(mockScrims.find((s) => s.id === id) ?? mockScrims[0])
  } },
  { method: ['POST', 'PUT', 'DELETE', 'PATCH'], match: /\/api\/scrims/, handler: success },

  // Stratbook
  { method: 'GET', match: '/api/strategies', handler: () => ok({ strategies: mockStrategies }) },
  { method: 'GET', match: '/api/strategy-folders', handler: () => ok({ folders: mockStrategyFolders }) },
  { method: ['POST', 'PUT', 'DELETE', 'PATCH'], match: /\/api\/strateg/, handler: success },

  // VOD comments
  { method: 'GET', match: /\/api\/vod-comments/, handler: () => ok({ comments: mockVodComments }) },
  { method: ['POST', 'PUT', 'DELETE'], match: /\/api\/vod-comments/, handler: success },

  // Absences & recurring availability
  { method: 'GET', match: '/api/absences', handler: () => ok({ absences: mockAbsences }) },
  { method: ['POST', 'PUT', 'DELETE'], match: /\/api\/absences/, handler: success },
  { method: 'GET', match: '/api/recurring-availabilities', handler: () => ok({ recurring: mockRecurring }) },
  { method: ['POST', 'PUT', 'DELETE'], match: /\/api\/recurring-availabilities/, handler: success },

  // Logs & bot/discord meta
  { method: 'GET', match: '/api/logs', handler: () => ok({ logs: mockLogs }) },
  { method: 'GET', match: '/api/bot-status', handler: () => ok(mockBotStatus) },
  { method: 'GET', match: '/api/discord/channels', handler: () => ok(mockDiscordChannels) },
  { method: 'GET', match: '/api/discord/roles', handler: () => ok(mockDiscordRoles) },

  // Bot actions
  { method: 'POST', match: /\/api\/actions\/(schedule|remind|poll|notify)/, handler: success },

  // Fallback for anything else under /api/ — return empty success so the UI
  // shows an empty state instead of an error.
  { method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], match: /\/api\//, handler: () => ({}) },
]

function methodMatches(want: Method | Method[], got: Method): boolean {
  return Array.isArray(want) ? want.includes(got) : want === got
}

function findRoute(url: URL, method: Method): { route: MockRoute; match: RegExpMatchArray | null } | null {
  for (const route of routes) {
    if (!methodMatches(route.method, method)) continue
    if (typeof route.match === 'string') {
      if (url.pathname === route.match) return { route, match: null }
    } else {
      const m = url.pathname.match(route.match)
      if (m) return { route, match: m }
    }
  }
  return null
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function installMockFetch(): void {
  const realFetch = window.fetch.bind(window)

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (!rawUrl.includes('/api/')) return realFetch(input as RequestInfo, init)

    const url = new URL(rawUrl, window.location.origin)
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase() as Method

    const hit = findRoute(url, method)
    if (!hit) {
      console.warn(`[mock-fetch] no handler for ${method} ${url.pathname}`)
      return jsonResponse({ error: `Not found in dev mock: ${method} ${url.pathname}` }, 404)
    }

    let body: unknown = undefined
    if (init?.body && typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body)
      } catch {
        body = init.body
      }
    }

    try {
      const result = await hit.route.handler({ url, method, body, match: hit.match })
      return jsonResponse(result ?? {})
    } catch (err) {
      console.error('[mock-fetch] handler threw', err)
      return jsonResponse({ error: 'Mock handler error' }, 500)
    }
  }) as typeof window.fetch
}
