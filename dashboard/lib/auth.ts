const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface User {
  username: string;
  role: 'admin' | 'user';
  avatar?: string;
}

export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('adminAuth'); // Remove old auth flag
  }
}

export function setUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
  return {
    'Content-Type': 'application/json',
  };
}

export async function logout(): Promise<void> {
  removeAuthToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/**
 * Validates the current JWT token by making a test request to the server.
 * If the token is invalid (401/403), it will be automatically removed.
 * @returns true if token is valid, false otherwise
 */
export async function validateToken(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  try {
    const { BOT_API_URL } = await import('./config');
    const response = await fetch(`${BOT_API_URL}/api/auth/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // If token is invalid (401/403), remove it
    if (response.status === 401 || response.status === 403) {
      removeAuthToken();
      return false;
    }

    return response.ok;
  } catch (error) {
    // On network error, don't remove token (may be transient) but treat as not validated
    return false;
  }
}
