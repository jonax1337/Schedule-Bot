import { Request, Response, NextFunction } from 'express';
import { runWithOrg } from '../tenancy/orgContext.js';
import { getOrganizationBySlug, type OrganizationData } from '../../repositories/organization.repository.js';
import { getOrgConfig } from '../config/config.js';
import { logger, getErrorMessage } from '../utils/logger.js';

export interface TenantRequest extends Request {
  org?: OrganizationData;
  isControlPlane?: boolean;
}

/**
 * Paths that operate on accounts/orgs (not tenant data) and are served from the
 * apex (synqed.org / api.synqed.org), so they may legitimately run without a
 * resolved tenant. Everything else is tenant-scoped and must have an org.
 * Matched with an optional /api prefix (resolveTenant is mounted under /api).
 */
function isControlPlanePath(path: string): boolean {
  const p = path.replace(/^\/api/, '');
  return p.startsWith('/platform') || p.startsWith('/auth/') || p === '/admin/login';
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
  const controlPlane = isControlPlanePath(req.path);

  // Resolve a tenant from the slug, if there is one.
  let org: OrganizationData | null = null;
  if (slug) {
    try {
      org = await getOrganizationBySlug(slug);
    } catch (error) {
      logger.error('Tenant resolution failed', getErrorMessage(error));
      res.status(500).json({ error: 'Tenant resolution failed' });
      return;
    }
  }

  if (org) {
    req.org = org;
    // Warm this org's runtime config so config.* resolves correctly for the
    // request (e.g. actions posting to the org's channel). Cached after first.
    await getOrgConfig(org.id);
    runWithOrg(org.id, () => next());
    return;
  }

  // No resolved tenant. Control-plane / auth-bootstrap routes (/platform,
  // /auth/*, /admin/login) operate on accounts, not tenant data, and are served
  // from the tenant-less control-plane host (which still sends X-Tenant=default),
  // so they run unscoped. Every other path is tenant-scoped → fail closed. (The
  // /auth/user role lookup gets a real org above when called from a team
  // subdomain, so owner/admin membership still resolves there.)
  if (controlPlane) {
    req.isControlPlane = true;
    next();
    return;
  }
  res.status(400).json({ error: slug ? `Unknown tenant "${slug}"` : 'Tenant context required' });
}
