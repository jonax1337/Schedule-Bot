/**
 * Globally intercepts window.fetch in demo mode. Reads + writes go
 * through the persistent state in store.ts so a user's edits survive
 * reloads within the tab.
 */

import { getMockState, getSchedules, updateMockState, type ScheduleDay } from './store'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface MockContext {
  url: URL
  method: Method
  body: any
  match: RegExpMatchArray | null
}

type MockHandler = (ctx: MockContext) => unknown | Promise<unknown>

interface MockRoute {
  method: Method | Method[]
  match: string | RegExp
  handler: MockHandler
}

const ok = <T>(data: T) => data
const success = () => ({ success: true })

function todayKey(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

const routes: MockRoute[] = [
  // ----- Settings & branding -----
  { method: 'GET', match: '/api/settings', handler: () => ok(getMockState().settings) },
  {
    method: 'POST',
    match: '/api/settings',
    handler: ({ body }) => {
      updateMockState((s) => {
        if (body && typeof body === 'object') Object.assign(s.settings, body)
      })
      return { success: true }
    },
  },

  // ----- User mappings -----
  { method: 'GET', match: '/api/user-mappings', handler: () => ok({ mappings: getMockState().userMappings }) },
  { method: ['POST', 'PUT', 'DELETE'], match: /\/api\/user-mappings/, handler: success },

  // ----- Auth — demo flow -----
  // validateToken hits this; reflect whatever the client last stored.
  {
    method: 'GET',
    match: '/api/auth/user',
    handler: () => {
      const stored = localStorage.getItem('auth_user')
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {}
      }
      return { username: 'demo', role: 'user' }
    },
  },
  {
    method: 'POST',
    match: '/api/admin/login',
    handler: ({ body }) => ({
      success: true,
      token: 'demo-fake-jwt-admin',
      user: { username: (body as any)?.username || 'demo-admin', role: 'admin' },
    }),
  },
  {
    method: 'POST',
    match: '/api/user/login',
    handler: ({ body }) => ({
      success: true,
      token: 'demo-fake-jwt-user',
      user: { username: (body as any)?.username ?? 'Phoenix', role: 'user' },
    }),
  },
  // Click "Continue with Discord" → we send the caller straight to
  // our own /auth/callback so the existing page logic kicks in.
  {
    method: 'GET',
    match: '/api/auth/discord',
    handler: () => ({ url: '/auth/callback?code=demo&state=demo' }),
  },
  {
    method: 'GET',
    match: /\/api\/auth\/discord\/callback/,
    handler: () => ({
      success: true,
      token: 'demo-fake-jwt-discord',
      user: { username: 'Phoenix', role: 'user' },
    }),
  },

  // ----- Schedule -----
  {
    method: 'GET',
    match: '/api/schedule/today',
    handler: () => {
      const key = todayKey()
      return ok(getMockState().schedulesByDate[key] ?? { date: key, reason: '', focus: '', players: [] })
    },
  },
  { method: 'GET', match: '/api/schedule/week', handler: () => ok({ days: getSchedules().slice(20, 27) }) },
  { method: 'GET', match: '/api/schedule/next14', handler: () => ok(getSchedules()) },
  { method: 'GET', match: '/api/schedule/month', handler: () => ok(getSchedules()) },
  { method: 'GET', match: /\/api\/schedule\/range/, handler: () => ok({ success: true, schedules: getSchedules() }) },
  {
    method: 'GET',
    match: /\/api\/schedule\/[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/,
    handler: ({ url }) => {
      const date = url.pathname.split('/').pop()!
      return ok(getMockState().schedulesByDate[date] ?? { date, reason: '', focus: '', players: [] })
    },
  },
  // Player updates own availability — persist so the user sees their
  // change reflected on the calendar after the toast.
  {
    method: 'POST',
    match: '/api/schedule/update-availability',
    handler: ({ body }) => {
      const { date, username, availability } = (body as { date?: string; username?: string; availability?: string }) ?? {}
      if (date && username) {
        updateMockState((s) => {
          const day = s.schedulesByDate[date]
          if (!day) return
          const p = day.players.find((pl) => pl.displayName === username)
          if (p) p.availability = availability ?? ''
        })
      }
      return { success: true }
    },
  },
  // Admin changes reason/focus for a day.
  {
    method: 'POST',
    match: '/api/schedule/update-reason',
    handler: ({ body }) => {
      const { date, reason, focus } = (body as { date?: string; reason?: string; focus?: string }) ?? {}
      if (date) {
        updateMockState((s) => {
          let day = s.schedulesByDate[date]
          if (!day) day = s.schedulesByDate[date] = { date, reason: '', focus: '', players: [] }
          if (reason !== undefined) day.reason = reason
          if (focus !== undefined) day.focus = focus
        })
      }
      return { success: true }
    },
  },
  { method: ['POST', 'PUT', 'DELETE', 'PATCH'], match: /\/api\/schedule/, handler: success },

  // ----- Absences -----
  { method: 'GET', match: '/api/absences', handler: () => ok({ absences: getMockState().absences }) },
  { method: 'GET', match: /\/api\/absences\/by-dates/, handler: () => ok({ absences: getMockState().absences }) },
  {
    method: 'POST',
    match: /^\/api\/absences\/?$/,
    handler: ({ body }) => {
      const b = body as { discordId?: string; displayName?: string; startDate?: string; endDate?: string; reason?: string } | null
      if (b?.startDate && b?.endDate) {
        updateMockState((s) => {
          s.absences.push({
            id: (s.absences.at(-1)?.id ?? 0) + 1,
            discordId: b.discordId ?? '',
            displayName: b.displayName ?? '',
            startDate: b.startDate!,
            endDate: b.endDate!,
            reason: b.reason ?? '',
            createdAt: new Date().toISOString(),
          })
        })
      }
      return { success: true }
    },
  },
  {
    method: 'DELETE',
    match: /\/api\/absences\/(\d+)$/,
    handler: ({ match }) => {
      const id = Number(match?.[1])
      if (Number.isFinite(id)) {
        updateMockState((s) => {
          s.absences = s.absences.filter((a) => a.id !== id)
        })
      }
      return { success: true }
    },
  },
  { method: ['PUT', 'PATCH'], match: /\/api\/absences/, handler: success },

  // ----- Recurring availability -----
  { method: 'GET', match: '/api/recurring-availabilities', handler: () => ok({ recurring: getMockState().recurring }) },
  { method: ['POST', 'PUT', 'DELETE'], match: /\/api\/recurring-availabilities/, handler: success },

  // ----- Scrims & stats -----
  { method: 'GET', match: '/api/scrims', handler: () => ok({ scrims: getMockState().scrims }) },
  {
    method: 'GET',
    match: /\/api\/scrims\/stats/,
    handler: () => {
      const scrims = getMockState().scrims
      const wins = scrims.filter((s) => s.result === 'win').length
      const losses = scrims.filter((s) => s.result === 'loss').length
      const draws = scrims.filter((s) => s.result === 'draw').length
      const mapStats: Record<string, { played: number; wins: number; losses: number }> = {}
      scrims.forEach((s) => {
        const m = (mapStats[s.map] ||= { played: 0, wins: 0, losses: 0 })
        m.played++
        if (s.result === 'win') m.wins++
        else if (s.result === 'loss') m.losses++
      })
      return ok({
        totalScrims: scrims.length,
        wins,
        losses,
        draws,
        winRate: scrims.length ? wins / scrims.length : 0,
        mapStats,
      })
    },
  },
  {
    method: 'GET',
    match: /\/api\/scrims\/([^/]+)$/,
    handler: ({ match }) => {
      const id = match?.[1]
      return ok(getMockState().scrims.find((s) => s.id === id) ?? getMockState().scrims[0])
    },
  },
  {
    method: 'POST',
    match: /^\/api\/scrims\/?$/,
    handler: ({ body }) => {
      const b = body as Partial<(typeof getMockState)['prototype']> as any
      updateMockState((s) => {
        const id = `scrim-${s.scrims.length + 1}-${Date.now()}`
        s.scrims.unshift({
          id,
          date: b?.date ?? todayKey(),
          opponent: b?.opponent ?? 'New Opponent',
          result: b?.result ?? 'draw',
          scoreUs: b?.scoreUs ?? 0,
          scoreThem: b?.scoreThem ?? 0,
          map: b?.map ?? 'Ascent',
          matchType: b?.matchType ?? 'Scrim',
          ourAgents: b?.ourAgents ?? [],
          theirAgents: b?.theirAgents ?? [],
          vodUrl: b?.vodUrl ?? null,
          matchLink: b?.matchLink ?? '',
          notes: b?.notes ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      })
      return { success: true }
    },
  },
  {
    method: 'DELETE',
    match: /\/api\/scrims\/([^/]+)$/,
    handler: ({ match }) => {
      const id = match?.[1]
      updateMockState((s) => {
        s.scrims = s.scrims.filter((sc) => sc.id !== id)
      })
      return { success: true }
    },
  },
  { method: ['PUT', 'PATCH'], match: /\/api\/scrims/, handler: success },

  // ----- Stratbook -----
  { method: 'GET', match: '/api/strategies', handler: () => ok({ strategies: getMockState().strategies }) },
  { method: 'GET', match: '/api/strategy-folders', handler: () => ok({ folders: getMockState().strategyFolders }) },
  {
    method: 'POST',
    match: /^\/api\/strategies\/?$/,
    handler: ({ body }) => {
      const b = (body as any) ?? {}
      updateMockState((s) => {
        const id = (s.strategies.at(-1)?.id ?? 0) + 1
        s.strategies.push({
          id,
          name: b.name ?? 'New Strategy',
          map: b.map ?? 'Ascent',
          side: b.side ?? 'attack',
          folderId: b.folderId ?? null,
          description: b.description ?? '',
          content: b.content ?? { type: 'doc', content: [] },
          pdfUrl: null,
          sortOrder: s.strategies.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      })
      return { success: true }
    },
  },
  {
    method: 'DELETE',
    match: /\/api\/strategies\/(\d+)$/,
    handler: ({ match }) => {
      const id = Number(match?.[1])
      updateMockState((s) => {
        s.strategies = s.strategies.filter((st) => st.id !== id)
      })
      return { success: true }
    },
  },
  { method: ['PUT', 'PATCH'], match: /\/api\/strategies/, handler: success },
  { method: ['POST', 'PUT', 'DELETE', 'PATCH'], match: /\/api\/strategy-folders/, handler: success },

  // ----- VOD comments -----
  {
    method: 'GET',
    match: /\/api\/vod-comments/,
    handler: ({ url }) => {
      const scrimId = url.searchParams.get('scrimId')
      const byScrim = getMockState().vodCommentsByScrim
      return ok({ comments: scrimId ? byScrim[scrimId] ?? [] : Object.values(byScrim).flat() })
    },
  },
  {
    method: 'POST',
    match: /^\/api\/vod-comments\/?$/,
    handler: ({ body }) => {
      const b = body as { scrimId?: string; userName?: string; timestamp?: number; content?: string }
      if (b?.scrimId) {
        updateMockState((s) => {
          const list = (s.vodCommentsByScrim[b.scrimId!] ||= [])
          list.push({
            id: list.length + 1,
            scrimId: b.scrimId!,
            userName: b.userName ?? 'demo',
            timestamp: b.timestamp ?? 0,
            content: b.content ?? '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        })
      }
      return { success: true }
    },
  },
  { method: ['PUT', 'PATCH', 'DELETE'], match: /\/api\/vod-comments/, handler: success },

  // ----- Logs & bot meta -----
  { method: 'GET', match: '/api/logs', handler: () => ok({ logs: getMockState().logs }) },
  {
    method: 'GET',
    match: '/api/bot-status',
    handler: () => ok({ ready: true, uptime: 12345, guildName: getMockState().settings.branding.teamName, guildId: 'demo', user: { username: 'synqed', id: 'demo' } }),
  },
  { method: 'GET', match: '/api/discord/channels', handler: () => ok({ channels: [{ id: '1', name: 'general', type: 0 }, { id: '2', name: 'scrim-talk', type: 0 }] }) },
  { method: 'GET', match: '/api/discord/roles', handler: () => ok({ roles: [{ id: '10', name: '@everyone' }, { id: '11', name: 'Player' }] }) },

  // ----- Bot actions -----
  { method: 'POST', match: /\/api\/actions\/(schedule|remind|poll|notify)/, handler: success },

  // Fallback: any unknown /api/ route returns {} so UIs see empty state.
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
      return jsonResponse({ error: `Not found in demo mock: ${method} ${url.pathname}` }, 404)
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
