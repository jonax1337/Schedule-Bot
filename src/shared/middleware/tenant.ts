import { Request, Response, NextFunction } from 'express';
import { runWithOrg } from '../tenancy/orgContext.js';
import { getOrganizationBySlug, type OrganizationData } from '../../repositories/organization.repository.js';
import { logger, getErrorMessage } from '../utils/logger.js';

export interface TenantRequest extends Request {
  org?: OrganizationData;
}

const DEFAULT_ORG_SLUG = process.env.POC_DEFAULT_ORG_SLUG || 'default';

/**
 * Resolve the tenant for this request and run the rest of the chain inside its
 * org context (AsyncLocalStorage), so every Prisma query is auto-scoped.
 *
 * Slug source (PoC): `X-Tenant` header (set by the SPA from the subdomain), or
 * a `?tenant=` query for curl testing. Falls back to the default org so health
 * checks and pre-login endpoints keep working.
 */
export async function resolveTenant(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
  const headerSlug = (req.headers['x-tenant'] as string | undefined)?.trim();
  const querySlug = (req.query.tenant as string | undefined)?.trim();
  const slug = headerSlug || querySlug || DEFAULT_ORG_SLUG;

  try {
    const org = await getOrganizationBySlug(slug);
    if (!org) {
      res.status(400).json({ error: `Unknown tenant "${slug}"` });
      return;
    }
    req.org = org;
    runWithOrg(org.id, () => next());
  } catch (error) {
    logger.error('Tenant resolution failed', getErrorMessage(error));
    res.status(500).json({ error: 'Tenant resolution failed' });
  }
}
