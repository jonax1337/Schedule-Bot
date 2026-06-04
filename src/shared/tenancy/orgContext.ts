import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request / per-event tenant context.
 *
 * Carries the active organizationId through the entire async call chain so the
 * Prisma guard (see database.repository.ts) can scope every query without each
 * repository function having to thread an `orgId` parameter.
 *
 * Set it at every entry point that touches tenant data:
 *  - HTTP requests: the tenant middleware wraps each request.
 *  - Bot events, scheduler cron, startup: wrapped in the default org context
 *    (PoC) — later a per-org loop / guildId→org resolution.
 *
 * If a tenant-model query runs with NO context, the guard throws (fail-closed),
 * so a forgotten wrap surfaces loudly instead of leaking across tenants.
 */
export const orgContext = new AsyncLocalStorage<string>();

/** Run `fn` with `organizationId` as the active tenant context. */
export function runWithOrg<T>(organizationId: string, fn: () => T): T {
  return orgContext.run(organizationId, fn);
}

/** The active organizationId, or undefined if no context is set. */
export function getCurrentOrgId(): string | undefined {
  return orgContext.getStore();
}

/**
 * The active organizationId, or throw (fail-closed). Use when stamping a new
 * tenant row's `organizationId` on create — keeps the create type-safe while
 * the guard handles where-scoping on reads.
 */
export function requireOrgId(): string {
  const orgId = orgContext.getStore();
  if (!orgId) {
    throw new Error('[tenancy] requireOrgId() called with no organization context.');
  }
  return orgId;
}
