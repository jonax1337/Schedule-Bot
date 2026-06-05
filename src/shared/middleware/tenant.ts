import { Request, Response, NextFunction } from 'express';
import { runWithOrg } from '../tenancy/orgContext.js';
import { getOrganizationBySlug, type OrganizationData } from '../../repositories/organization.repository.js';
import { getOrgConfig } from '../config/config.js';
import { logger, getErrorMessage } from '../utils/logger.js';

export interface TenantRequest extends Request {
  org?: OrganizationData;
}

// SECURITY: a client-supplied `X-Tenant` / `?tenant=` slug is SPOOFABLE. Honoring
// it alone is a cross-tenant IDOR — any authenticated user could read another
// org's data by changing the header. It is therefore gated behind an explicit
// PoC opt-in and refused in production.
const ALLOW_CLIENT_TENANT = process.env.POC_ALLOW_HEADER_TENANT === '1';

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin']);

/** Trusted slug from the request host (subdomain): g2.synqed.org → "g2". */
function slugFromHost(req: Request): string | undefined {
  const host = (req.hostname || '').toLowerCase();
  const parts = host.split('.');
  if (parts.length > 2 && !RESERVED_SUBDOMAINS.has(parts[0]) && host !== 'localhost') {
    return parts[0];
  }
  return undefined;
}

/**
 * Resolve the tenant for this request and run the rest of the chain inside its
 * org context (AsyncLocalStorage), so every Prisma query is auto-scoped.
 *
 * Trust model:
 *  - Production: slug comes from the verified subdomain only.
 *  - PoC (POC_ALLOW_HEADER_TENANT=1): also accept `X-Tenant` / `?tenant=` so the
 *    dashboard tenant switcher works locally without real subdomains.
 *
 * TODO (before prod): once the Account/Membership model lands (plan §8.3), move
 * this AFTER auth and reject requests where the authenticated user has no
 * membership in the resolved org (`org.id ∈ req.user.memberships`). Until then
 * the header path must stay PoC-only.
 */
export async function resolveTenant(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
  const clientSlug = ALLOW_CLIENT_TENANT
    ? (req.headers['x-tenant'] as string | undefined)?.trim() || (req.query.tenant as string | undefined)?.trim()
    : undefined;

  const slug = slugFromHost(req) || clientSlug;

  // Apex / control plane (synqed.org and api.synqed.org — no team subdomain):
  // there is no tenant. Run the request unscoped so control-plane and auth
  // routes (which operate on accounts/orgs, not tenant data) work. Tenant-scoped
  // team routes are only ever called from a team subdomain, so they still get a
  // resolved org below; if one is somehow called here the Prisma guard fails
  // closed (throws) rather than leaking another tenant's data.
  if (!slug) {
    next();
    return;
  }

  try {
    const org = await getOrganizationBySlug(slug);
    if (!org) {
      res.status(400).json({ error: `Unknown tenant "${slug}"` });
      return;
    }
    req.org = org;
    // Warm this org's runtime config so config.* resolves correctly for the
    // request (e.g. actions posting to the org's channel). Cached after first.
    await getOrgConfig(org.id);
    runWithOrg(org.id, () => next());
  } catch (error) {
    logger.error('Tenant resolution failed', getErrorMessage(error));
    res.status(500).json({ error: 'Tenant resolution failed' });
  }
}
