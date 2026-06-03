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
  const token = getAuthToken()
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }
  return { 'Content-Type': 'application/json' }
}

export async function logout(): Promise<void> {
  removeAuthToken()
  window.location.href = '/login'
}

/**
 * Validates the current JWT token by making a test request to the server.
 * If the token is invalid (401/403), it will be automatically removed.
 */
export async function validateToken(): Promise<boolean> {
  const token = getAuthToken()
  if (!token) return false

  try {
    const { BOT_API_URL } = await import('./config')
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
