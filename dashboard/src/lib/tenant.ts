/**
 * Tenant (organization) resolution for the multi-tenant SPA.
 *
 * One build serves every team. The tenant slug is derived from the **subdomain**
 * the user is on (g2.synqed.org → "g2"; g2.localhost:3000 → "g2") and sent to the
 * backend as `X-Tenant`. On the apex (localhost / synqed.org — the control plane)
 * there is no subdomain, so we fall back to a dev override or "default".
 */
const STORAGE_KEY = 'poc-tenant'
const DEFAULT_SLUG = 'default'
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'control', 'synqed'])

/** The subdomain label, or undefined on the apex. */
function subdomainOf(hostname: string): string | undefined {
  let sub: string | undefined
  if (hostname.endsWith('.localhost')) {
    sub = hostname.split('.')[0] // g2.localhost → g2
  } else {
    const parts = hostname.split('.')
    if (parts.length > 2) sub = parts[0] // g2.synqed.org → g2
  }
  return sub && !RESERVED.has(sub) ? sub : undefined
}

export function getTenantSlug(): string {
  if (typeof window === 'undefined') return DEFAULT_SLUG

  const sub = subdomainOf(window.location.hostname)
  if (sub) return sub

  // Apex (no subdomain). The ?tenant=/localStorage override is a DEV-ONLY
  // convenience for testing without real subdomains; in production the apex is
  // the control plane, so we never honor a client-chosen tenant there.
  if (import.meta.env.DEV) {
    const fromQuery = new URLSearchParams(window.location.search).get('tenant')?.trim()
    if (fromQuery) {
      localStorage.setItem(STORAGE_KEY, fromQuery)
      return fromQuery
    }
    return localStorage.getItem(STORAGE_KEY)?.trim() || DEFAULT_SLUG
  }
  return DEFAULT_SLUG
}

export function setTenantSlug(slug: string): void {
  localStorage.setItem(STORAGE_KEY, slug)
}

export function getTenantHeader(): Record<string, string> {
  return { 'X-Tenant': getTenantSlug() }
}

/**
 * Build the URL for a team on its own subdomain, preserving protocol/port.
 * localhost:3000 → <slug>.localhost:3000 ; synqed.org → <slug>.synqed.org
 */
export function subdomainUrl(slug: string, path = '/'): string {
  const { protocol, hostname, port } = window.location
  const portPart = port ? `:${port}` : ''
  let baseHost: string
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    baseHost = 'localhost'
  } else {
    baseHost = hostname.split('.').slice(-2).join('.') // strip any existing subdomain → synqed.org
  }
  return `${protocol}//${slug}.${baseHost}${portPart}${path}`
}
