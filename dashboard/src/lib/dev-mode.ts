/**
 * Dev-mode toggle. Enabled when `VITE_DEV_MODE=true` is set (or the
 * legacy `import.meta.env.VITE_DEV_MODE` flag — Vite normalises both).
 *
 * When on:
 *  - ProtectedRoute lets every navigation through without checking the JWT.
 *  - install-mock-fetch.ts intercepts every /api/... fetch and returns
 *    fixture data so the UI is fully browsable with no backend running.
 *  - main.tsx pre-populates localStorage with a fake admin/user so any
 *    code that pulls `getUser()` or `selectedUser` still works.
 *  - A banner at the top of the shell lets you switch role.
 */

export const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

export type DevRole = 'admin' | 'user'

const DEV_ROLE_KEY = 'dev_mode_role'

export function getDevRole(): DevRole {
  const stored = localStorage.getItem(DEV_ROLE_KEY)
  return stored === 'user' ? 'user' : 'admin'
}

export function setDevRole(role: DevRole): void {
  localStorage.setItem(DEV_ROLE_KEY, role)
  // Reflect into the regular auth slots so the rest of the app sees the change.
  applyDevAuth(role)
  // Hard reload so every component re-reads localStorage at the top.
  window.location.reload()
}

export function applyDevAuth(role: DevRole = getDevRole()): void {
  const user =
    role === 'admin'
      ? { username: 'dev-admin', role: 'admin' as const }
      : { username: 'Phoenix', role: 'user' as const }

  localStorage.setItem('auth_token', 'dev-mode-fake-jwt')
  localStorage.setItem('auth_user', JSON.stringify(user))
  localStorage.setItem('selectedUser', user.username)
}
