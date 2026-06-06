import { BOT_API_URL } from './config'
import { getTenantHeader, subdomainUrl } from './tenant'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export interface User {
  username: string
  role: 'admin' | 'user'
  avatar?: string
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem('adminAuth')
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser(): User | null {
  const userStr = localStorage.getItem(USER_KEY)
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

export function getAuthHeaders(): Record<string, string> {
  // X-Tenant is included here so EVERY caller (raw fetch + apiGet/apiPost) is
  // tenant-scoped. Omitting it makes the backend fall back to the default org —
  // the cause of admin pages leaking one team's data into another.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getTenantHeader(),
  }
  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export async function logout(): Promise<void> {
  removeAuthToken()
  window.location.href = '/login'
}

/**
 * Cross-subdomain login handoff. localStorage is per-origin, so navigating to a
 * team subdomain needs the session carried across. We do NOT put the bearer
 * token in the URL: the source mints a short-lived, single-use, account-bound
 * code (server-side), the destination redeems it for a fresh token.
 *
 * `teamHandoffUrl` builds the destination URL with a `#handoff=<code>` fragment;
 * `consumeAuthHandoff` redeems it on load. The code is opaque, 30s, single-use
 * and bound to the minting account, so it leaks nothing and can't fixate a
 * session (and we never re-bind an already-authenticated tab).
 */
export async function teamHandoffUrl(slug: string, path = '/'): Promise<string> {
  const base = subdomainUrl(slug, path)
  if (!getAuthToken()) return base
  try {
    const res = await fetch(`${BOT_API_URL}/api/platform/handoff`, { method: 'POST', headers: getAuthHeaders() })
    if (res.ok) {
      const { code } = await res.json()
      if (code) return `${base}#handoff=${encodeURIComponent(code)}`
    }
  } catch {
    /* fall back to no handoff — user just logs in on the subdomain */
  }
  return base
}

export async function consumeAuthHandoff(): Promise<void> {
  if (typeof window === 'undefined' || !window.location.hash) return
  const params = new URLSearchParams(window.location.hash.slice(1))
  const code = params.get('handoff')
  if (!code) return

  // Strip the fragment immediately; never re-bind an already-authenticated tab.
  history.replaceState(null, '', window.location.pathname + window.location.search)
  if (getAuthToken()) return

  try {
    const res = await fetch(`${BOT_API_URL}/api/platform/handoff/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.token) {
        setAuthToken(data.token)
        if (data.user) setUser(data.user)
      }
    }
  } catch {
    /* ignore — user can sign in normally */
  }
}

/**
 * Validates the current JWT token by making a test request to the server.
 * If the token is invalid (401/403), it will be automatically removed.
 */
export async function validateToken(): Promise<boolean> {
  const token = getAuthToken()
  if (!token) return false

  try {
    // Include the tenant header so the server resolves the org and can return the
    // membership-derived role (an org OWNER/ADMIN is treated as 'admin' here).
    const response = await fetch(`${BOT_API_URL}/api/auth/user`, {
      headers: getAuthHeaders(),
    })

    if (response.status === 401 || response.status === 403) {
      removeAuthToken()
      return false
    }

    if (response.ok) {
      // Sync the role from the server-validated JWT to localStorage
      // to prevent localStorage manipulation from bypassing role checks
      const data = await response.json()
      const currentUser = getUser()
      if (currentUser && data.role && currentUser.role !== data.role) {
        setUser({ ...currentUser, role: data.role })
      }
      return true
    }

    return false
  } catch {
    return false
  }
}
