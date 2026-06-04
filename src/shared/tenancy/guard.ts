/**
 * Tenant-scoping guard logic (pure, DB-free, unit-testable).
 *
 * `applyTenantScope` is the single authority that decides how a Prisma query
 * against a tenant model is constrained to the active organization. The Prisma
 * client extension (database.repository.ts) is a thin wrapper that calls this.
 */

/**
 * Models whose rows belong to exactly one organization.
 * NOTE: `Setting` is intentionally NOT here yet — it's global until the config
 * singleton is refactored to be per-org (own phase). `Account`/`Membership`
 * are platform-level (control plane), never tenant-scoped.
 */
export const TENANT_MODELS = new Set<string>([
  'Schedule', 'SchedulePlayer',
  'Scrim', 'VodComment', 'Absence', 'RecurringAvailability', 'UserMapping',
  'StrategyFolder', 'Strategy', 'StrategyImage', 'StrategyFile',
]);

// Operations that filter rows via a `where` clause we constrain to the org.
// update/delete by id are included so the guard is AUTHORITATIVE: injecting
// organizationId turns a cross-org id into a not-found (P2025), not a silent hit.
const WHERE_SCOPED_OPS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow',
  'count', 'aggregate', 'groupBy',
  'update', 'delete', 'updateMany', 'deleteMany',
]);

// Operations that create rows whose `data` we stamp with the org.
const CREATE_OPS = new Set(['create', 'createMany']);

// findUnique/upsert can't be safely scoped on a composite [org, x] unique key;
// callers use findFirst / find-then-write instead.
const UNSUPPORTED_OPS = new Set(['findUnique', 'findUniqueOrThrow', 'upsert']);

export function isTenantModel(model: string | undefined): boolean {
  return model != null && TENANT_MODELS.has(model);
}

function withOrgId(data: Record<string, unknown>, orgId: string): Record<string, unknown> {
  return data.organizationId == null ? { ...data, organizationId: orgId } : data;
}

/**
 * Return a new args object scoped to `orgId`, or throw fail-closed.
 *
 * - Non-tenant model → args returned unchanged.
 * - Tenant model + no orgId → throws (no silent cross-tenant leak).
 * - findUnique/upsert on a tenant model → throws (unsupported).
 * - Otherwise injects organizationId into `where` (reads/updates/deletes) or
 *   `data` (creates).
 */
export function applyTenantScope(
  model: string | undefined,
  operation: string,
  args: any,
  orgId: string | undefined,
): any {
  if (!isTenantModel(model)) return args;

  if (!orgId) {
    throw new Error(
      `[tenancy] Query on tenant model "${model}.${operation}" with no organization context. ` +
      `Wrap the entry point in runWithOrg() (request middleware / bot / scheduler / startup).`,
    );
  }

  if (UNSUPPORTED_OPS.has(operation)) {
    throw new Error(
      `[tenancy] "${operation}" is not supported on tenant model "${model}" ` +
      `(composite unique [organizationId, …]). Use findFirst / find-then-write instead.`,
    );
  }

  const a = { ...(args ?? {}) };

  if (WHERE_SCOPED_OPS.has(operation)) {
    a.where = { ...(a.where ?? {}), organizationId: orgId };
  } else if (CREATE_OPS.has(operation)) {
    if (operation === 'createMany') {
      const d = a.data;
      a.data = Array.isArray(d)
        ? d.map((row: Record<string, unknown>) => withOrgId(row, orgId))
        : withOrgId(d ?? {}, orgId);
    } else {
      a.data = withOrgId(a.data ?? {}, orgId);
    }
  }

  return a;
}
