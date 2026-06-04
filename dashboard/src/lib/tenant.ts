/**
 * Tenant (organization) resolution for the multi-tenant SPA.
 *
 * One build serves every team. The tenant slug is derived at runtime and sent
 * to the backend as the `X-Tenant` header, where it's resolved to an org.
 *
 * Slug source, in order:
 *   1. `?tenant=g2` query param or a stored dev override (PoC tenant switcher).
 *   2. The subdomain in production (g2.synqed.org → "g2").
 *   3. Fallback "default".
 */
const STORAGE_KEY = 'poc-tenant'
const DEFAULT_SLUG = 'default'
const RESERVED = new Set(['www', 'app', 'api', 'admin'])

export function getTenantSlug(): string {
  if (typeof window === 'undefined') return DEFAULT_SLUG

  const fromQuery = new URLSearchParams(window.location.search).get('tenant')?.trim()
  if (fromQuery) {
    localStorage.setItem(STORAGE_KEY, fromQuery)
    return fromQuery
  }

  const stored = localStorage.getItem(STORAGE_KEY)?.trim()
  if (stored) return stored

  const host = window.location.hostname
  const parts = host.split('.')
  // e.g. g2.synqed.org → ["g2","synqed","org"]; ignore bare localhost / apex
  if (parts.length > 2 && !RESERVED.has(parts[0]) && host !== 'localhost') {
    return parts[0]
  }

  return DEFAULT_SLUG
}

export function setTenantSlug(slug: string): void {
  localStorage.setItem(STORAGE_KEY, slug)
}

export function getTenantHeader(): Record<string, string> {
  return { 'X-Tenant': getTenantSlug() }
}
