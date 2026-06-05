import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { loadSettings, getSettingsForCurrentOrg, type Settings } from '../utils/settingsManager.js';
import { runWithOrg, getCurrentOrgId } from '../tenancy/orgContext.js';
import { getOrganizationById } from '../../repositories/organization.repository.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (3 levels up from dist/shared/config/)
dotenv.config({ path: resolve(__dirname, '../../../.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Per-org runtime config
// ---------------------------------------------------------------------------
// The `config` object below exposes the SAME shape as before, but every value
// is resolved from the organization in the active AsyncLocalStorage context.
// So all existing `config.scheduling.*` / `config.discord.*` reads (bot,
// scheduler, embeds, …) become per-org automatically — no call-site changes.
// Config is warmed per org (getOrgConfig) at startup and per scheduler tick.
interface OrgRuntime {
  settings: Settings;
  guildId: string;
}

const runtimeCache = new Map<string, OrgRuntime>();
let defaultOrgId: string | null = null;

function fallbackRuntime(): OrgRuntime {
  return { settings: loadSettings(), guildId: process.env.DISCORD_GUILD_ID || '' };
}

function activeRuntime(): OrgRuntime {
  const orgId = getCurrentOrgId() ?? defaultOrgId ?? undefined;
  return (orgId ? runtimeCache.get(orgId) : undefined) ?? fallbackRuntime();
}

/** Load + cache an org's runtime config (its settings + the guild it's bound to). */
export async function getOrgConfig(orgId: string): Promise<OrgRuntime> {
  const settings = await runWithOrg(orgId, () => getSettingsForCurrentOrg());
  const org = await getOrganizationById(orgId);
  const runtime: OrgRuntime = {
    settings,
    guildId: org?.discordGuildId || process.env.DISCORD_GUILD_ID || '',
  };
  runtimeCache.set(orgId, runtime);
  if (!defaultOrgId) defaultOrgId = orgId;
  return runtime;
}

export function invalidateOrgConfig(orgId: string): void {
  runtimeCache.delete(orgId);
}

export const config = {
  discord: {
    token: requireEnv('DISCORD_TOKEN'),
    get channelId() { return activeRuntime().settings.discord.channelId; },
    get guildId() { return activeRuntime().guildId; },
    get pingRoleId() { return activeRuntime().settings.discord.pingRoleId; },
  },
  scheduling: {
    get dailyPostTime() { return activeRuntime().settings.scheduling.dailyPostTime; },
    get timezone() { return activeRuntime().settings.scheduling.timezone; },
    get reminderHoursBefore() { return activeRuntime().settings.scheduling.reminderHoursBefore; },
    get duplicateReminderEnabled() { return activeRuntime().settings.scheduling.duplicateReminderEnabled; },
    get duplicateReminderHoursBefore() { return activeRuntime().settings.scheduling.duplicateReminderHoursBefore; },
    get trainingStartPollEnabled() { return activeRuntime().settings.scheduling.trainingStartPollEnabled; },
    get weeklyPingEnabled() { return activeRuntime().settings.scheduling.weeklyPingEnabled; },
    get weeklyPingTime() { return activeRuntime().settings.scheduling.weeklyPingTime; },
    get weeklyPingDays() { return activeRuntime().settings.scheduling.weeklyPingDays; },
  },
  admin: {
    username: requireEnv('ADMIN_USERNAME'),
  },
};

/**
 * Reload (warm) the active org's runtime config — called at startup (default org
 * context) and after a settings save. Per-org tick callers use getOrgConfig.
 */
export async function reloadConfig(): Promise<void> {
  const orgId = getCurrentOrgId() ?? defaultOrgId;
  if (orgId) {
    invalidateOrgConfig(orgId);
    await getOrgConfig(orgId);
  }
  logger.info('Configuration reloaded');
}
