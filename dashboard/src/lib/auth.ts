import { BOT_API_URL } from './config'
import { getTenantHeader } from './tenant'

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
 * Cross-subdomain auth handoff. localStorage is per-origin, so when we navigate
 * from the apex/control plane to a team subdomain we carry the token (+ user) in
 * the URL fragment. `withAuthHandoff` appends it; `consumeAuthHandoff` reads and
 * strips it on load. (MVP: fragment never hits the server; fine over https.)
 */
export function withAuthHandoff(url: string): string {
  const token = getAuthToken()
  if (!token) return url
  // Only the token travels — never a client-supplied user blob (untrusted).
  return `${url}#access_token=${encodeURIComponent(token)}`
}

export function consumeAuthHandoff(): void {
  if (typeof window === 'undefined' || !window.location.hash) return
  const params = new URLSearchParams(window.location.hash.slice(1))
  const token = params.get('access_token')
  if (!token) return

  // Strip the fragment immediately so the token never lingers in URL/history.
  history.replaceState(null, '', window.location.pathname + window.location.search)

  // Never silently re-bind an already-authenticated session (login-CSRF guard).
  if (getAuthToken()) return

  setAuthToken(token)
  // Don't trust any client-supplied identity — derive it from the backend.
  void fetch(`${BOT_API_URL}/api/auth/user`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d?.username) setUser({ username: d.username, role: d.role })
      else removeAuthToken()
    })
    .catch(() => {})
}

/**
 * Validates the current JWT token by making a test request to the server.
 * If the token is invalid (401/403), it will be automatically removed.
 */
export async function validateToken(): Promise<boolean> {
  const token = getAuthToken()
  if (!token) return false

  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/user`, {
      headers: { Authorization: `Bearer ${token}` },
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
