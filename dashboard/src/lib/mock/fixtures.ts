/**
 * Mock data used in dev mode. Shapes mirror what the real Express API
 * returns so the dashboard components see realistic data without a backend.
 *
 * Dates are generated relative to "today" so the schedule never looks stale.
 */

import { formatDateToDDMMYYYY } from '@/lib/date-utils'

function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return formatDateToDDMMYYYY(d)
}

export const mockSettings = {
  discord: {
    channelId: '1234567890',
    pingRoleId: '9876543210',
    allowDiscordAuth: false,
    pinnedWeekMessageId: null,
    pinnedWeekStartDate: null,
  },
  scheduling: {
    dailyPostTime: '09:00',
    reminderHoursBefore: 2,
    duplicateReminderEnabled: true,
    duplicateReminderHoursBefore: 1,
    trainingStartPollEnabled: true,
    pollDurationMinutes: 10,
    timezone: 'Europe/Berlin',
    cleanChannelBeforePost: false,
    changeNotificationsEnabled: true,
    weeklyPingEnabled: true,
    weeklyPingTime: '18:00',
    weeklyPingDays: [0],
  },
  branding: {
    teamName: 'DEV Team Phoenix',
  },
  stratbook: {
    editPermission: 'admin',
  },
}

export const mockUserMappings = {
  mappings: [
    { displayName: 'Phoenix', discordId: '111111111111111111', role: 'MAIN', isAdmin: false, avatarUrl: null, sortOrder: 0, userTimezone: null },
    { displayName: 'Jett', discordId: '222222222222222222', role: 'MAIN', isAdmin: false, avatarUrl: null, sortOrder: 1, userTimezone: null },
    { displayName: 'Sage', discordId: '333333333333333333', role: 'MAIN', isAdmin: true, avatarUrl: null, sortOrder: 2, userTimezone: null },
    { displayName: 'Sova', discordId: '444444444444444444', role: 'SUB', isAdmin: false, avatarUrl: null, sortOrder: 3, userTimezone: null },
    { displayName: 'Coach Killjoy', discordId: '555555555555555555', role: 'COACH', isAdmin: true, avatarUrl: null, sortOrder: 4, userTimezone: null },
  ],
}

const PLAYERS = mockUserMappings.mappings.map((m, i) => ({
  userId: m.discordId,
  displayName: m.displayName,
  availability: i % 3 === 0 ? '18:00-22:00' : i % 3 === 1 ? '19:00-23:00' : i === 4 ? '' : 'x',
  role: m.role,
  sortOrder: m.sortOrder,
}))

const REASONS = ['Training', 'Off-Day', 'VOD-Review', 'Scrims', 'Premier', 'Tournament']

// Spans ~60 days so the month calendar can navigate prev/next without
// running out of mock data.
export const mockSchedules = Array.from({ length: 60 }, (_, i) => i - 20).map((offset, i) => {
  const playersForDay = PLAYERS.map((p, pIdx) => {
    const seed = (offset * 7 + pIdx * 13) % 11
    let availability = ''
    if (seed < 0) availability = ''
    else if (seed < 4) availability = pIdx === 4 ? '' : `${17 + (seed % 2)}:00-${21 + (seed % 3)}:00`
    else if (seed < 7) availability = '19:00-22:00'
    else if (seed < 9) availability = 'x'
    return { ...p, availability }
  })
  return {
    date: dateOffset(offset),
    reason: offset === 0 ? 'Training' : REASONS[Math.abs(i + offset) % REASONS.length],
    focus: offset % 3 === 0 ? 'Map: Ascent — A-site executes' : offset % 3 === 1 ? '' : 'Review last scrim block',
    players: playersForDay,
  }
})

export const mockScrims = Array.from({ length: 8 }).map((_, i) => {
  const result: 'win' | 'loss' | 'draw' = i % 3 === 0 ? 'win' : i % 3 === 1 ? 'loss' : 'draw'
  return {
    id: `scrim-${i + 1}`,
    date: dateOffset(-(i + 1) * 2),
    opponent: ['Team Alpha', 'BlueWave', 'Nightfall', 'Zephyr', 'Crimson Bolt', 'Aurora', 'Vanguard'][i % 7],
    result,
    scoreUs: result === 'win' ? 13 : result === 'loss' ? 9 : 13,
    scoreThem: result === 'win' ? 7 : result === 'loss' ? 13 : 13,
    map: ['Ascent', 'Haven', 'Bind', 'Split', 'Lotus', 'Sunset', 'Breeze'][i % 7],
    matchType: i === 0 ? 'Tournament' : 'Scrim',
    ourAgents: ['Jett', 'Sage', 'Sova', 'Omen', 'Killjoy'],
    theirAgents: ['Phoenix', 'Cypher', 'Skye', 'Raze', 'Brimstone'],
    vodUrl: i === 0 ? 'https://youtube.com/watch?v=dQw4w9WgXcQ' : null,
    matchLink: '',
    notes: i === 0 ? 'Strong pistol round; lost economy mid' : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
})

export const mockScrimStats = {
  totalScrims: mockScrims.length,
  wins: mockScrims.filter((s) => s.result === 'win').length,
  losses: mockScrims.filter((s) => s.result === 'loss').length,
  draws: mockScrims.filter((s) => s.result === 'draw').length,
  winRate: 0.5,
  mapStats: {
    Ascent: { played: 3, wins: 2, losses: 1 },
    Haven: { played: 2, wins: 1, losses: 1 },
    Bind: { played: 2, wins: 0, losses: 2 },
    Split: { played: 1, wins: 1, losses: 0 },
  },
}

export const mockStrategyFolders = [
  { id: 1, name: 'Defaults', color: '#3b82f6', parentId: null, sortOrder: 0 },
  { id: 2, name: 'Anti-Stratz', color: '#ef4444', parentId: null, sortOrder: 1 },
  { id: 3, name: 'Pistol Rounds', color: '#22c55e', parentId: 1, sortOrder: 0 },
]

export const mockStrategies = [
  {
    id: 1,
    name: 'A-site default execute',
    map: 'Ascent',
    side: 'attack',
    folderId: 1,
    description: 'Standard 5-man A push with Omen smokes mid + cat.',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Omen smokes Heaven + CT. Sova arrow Tree. Push together after first contact.' }] }] },
    pdfUrl: null,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Eco round B-site',
    map: 'Haven',
    side: 'attack',
    folderId: 3,
    description: 'Stack B with shotguns and sheriffs.',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Stack 4 B, lurker A long.' }] }] },
    pdfUrl: null,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const mockAbsences = [
  {
    id: 1,
    discordId: PLAYERS[0].userId,
    displayName: PLAYERS[0].displayName,
    startDate: dateOffset(3),
    endDate: dateOffset(5),
    reason: 'Vacation',
    createdAt: new Date().toISOString(),
  },
]

export const mockRecurring = [
  { id: 1, discordId: PLAYERS[0].userId, dayOfWeek: 1, availability: '19:00-22:00' },
  { id: 2, discordId: PLAYERS[0].userId, dayOfWeek: 3, availability: '19:00-22:00' },
  { id: 3, discordId: PLAYERS[1].userId, dayOfWeek: 2, availability: '20:00-23:00' },
]

export const mockLogs = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  timestamp: new Date(Date.now() - i * 3600 * 1000).toISOString(),
  level: i % 4 === 0 ? 'error' : i % 4 === 1 ? 'warn' : 'info',
  source: ['scheduler', 'discord', 'api', 'bot'][i % 4],
  message: [
    'Posted daily schedule',
    'Reminder fired for Training',
    'Discord rate limit warning',
    'Failed to deliver DM to user — fallback to channel',
  ][i % 4],
}))

export const mockDiscordChannels = {
  channels: [
    { id: '1', name: 'general', type: 0 },
    { id: '2', name: 'scrim-talk', type: 0 },
    { id: '3', name: 'announcements', type: 0 },
    { id: '4', name: 'voice-1', type: 2 },
  ],
}

export const mockDiscordRoles = {
  roles: [
    { id: '10', name: '@everyone', color: 0 },
    { id: '11', name: 'Player', color: 0x3b82f6 },
    { id: '12', name: 'Coach', color: 0xef4444 },
  ],
}

export const mockBotStatus = {
  ready: true,
  uptime: 12345,
  guildName: 'DEV Team Phoenix',
  guildId: 'dev-guild',
  user: { username: 'synqed', id: 'dev-bot' },
}

export const mockVodComments = [
  { id: 1, scrimId: 'scrim-1', userName: 'Phoenix', timestamp: 45, content: 'Nice peek #aim', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 2, scrimId: 'scrim-1', userName: 'Sage', timestamp: 132, content: '@Phoenix should have held angle here #positioning', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 3, scrimId: 'scrim-1', userName: 'Coach Killjoy', timestamp: 240, content: 'Good round overall — repeat this exec next round', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]
