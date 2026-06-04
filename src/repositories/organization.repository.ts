import { prisma } from './database.repository.js';

/**
 * Organization (tenant) data access.
 *
 * Organization itself is NOT a tenant model, so these queries run without an
 * org context (the guard skips non-tenant models).
 */

export interface OrganizationData {
  id: string;
  slug: string;
  name: string;
  discordGuildId: string | null;
  discordChannelId: string | null;
  plan: string;
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationData | null> {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function getOrganizationByGuildId(guildId: string): Promise<OrganizationData | null> {
  return prisma.organization.findUnique({ where: { discordGuildId: guildId } });
}

/**
 * PoC: the org that the bot / scheduler / startup operate on when not inside an
 * HTTP request. Resolved by slug (env override, default "default") and cached.
 * Later this becomes a per-org loop / guildId resolution.
 */
const DEFAULT_ORG_SLUG = process.env.POC_DEFAULT_ORG_SLUG || 'default';
let cachedDefaultOrgId: string | null = null;

export async function getDefaultOrgId(): Promise<string> {
  if (cachedDefaultOrgId) return cachedDefaultOrgId;
  const org = await getOrganizationBySlug(DEFAULT_ORG_SLUG);
  if (!org) {
    throw new Error(
      `[tenancy] Default organization "${DEFAULT_ORG_SLUG}" not found. ` +
      `Run the PoC setup script (scripts/poc-tenancy-setup.ts) first.`,
    );
  }
  cachedDefaultOrgId = org.id;
  return org.id;
}
