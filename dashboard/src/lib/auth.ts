import { BOT_API_URL } from './config'
import { getTenantHeader } from './tenant'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export interface User {
  username: string
  role: 'admin' | 'user'
  /** Precise org tier (OWNER/ADMIN/MANAGER/MEMBER) for fine-grained gating. */
  orgRole?: string
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
 * Start Discord OAuth from this context. `returnTo` = where to land after login:
 * 'control' (control plane) or a team slug (→ its subdomain). A CSRF nonce is
 * stashed in sessionStorage and re-checked when the handoff lands — binding login
 * to this browser session (anti login-CSRF). The OAuth itself round-trips through
 * the neutral api host; the user lands back HERE, in this context.
 */
export async function startDiscordLogin(returnTo: string): Promise<void> {
  const csrf = crypto.randomUUID()
  sessionStorage.setItem('synqed_oauth_csrf', csrf)
  const res = await fetch(
    `${BOT_API_URL}/api/auth/discord?return=${encodeURIComponent(returnTo)}&csrf=${encodeURIComponent(csrf)}`,
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || data.error || 'Discord login unavailable')
  window.location.href = data.url
}

/**
 * The OAuth callback (neutral api host) 302-redirects back here with a single-use
 * `#handoff=<code>`. Redeem it for a token on THIS origin, sending the CSRF nonce
 * we stashed when starting login. localStorage is per-origin, so this is how the
 * session lands on the control plane / team subdomain. Never re-binds an
 * already-authenticated tab.
 */
export async function consumeAuthHandoff(): Promise<void> {
  if (typeof window === 'undefined' || !window.location.hash) return
  const params = new URLSearchParams(window.location.hash.slice(1))
  const code = params.get('handoff')
  if (!code) return

  history.replaceState(null, '', window.location.pathname + window.location.search)
  if (getAuthToken()) return

  const csrf = sessionStorage.getItem('synqed_oauth_csrf') || ''
  sessionStorage.removeItem('synqed_oauth_csrf')
  try {
    const res = await fetch(`${BOT_API_URL}/api/platform/handoff/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, csrf }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.token) {
        setAuthToken(data.token)
        if (data.user) {
          setUser(data.user)
          // The user pages (Availability/Recurring) resolve the current player by
          // this localStorage key; without it their hook bounces to /login.
          if (data.user.username) localStorage.setItem('selectedUser', data.user.username)
        }
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
      if (currentUser) {
        const next = { ...currentUser, role: data.role ?? currentUser.role, orgRole: data.orgRole ?? currentUser.orgRole }
        if (next.role !== currentUser.role || next.orgRole !== currentUser.orgRole) setUser(next)
      }
      return true
    }

    return false
  } catch {
    return false
  }
}
