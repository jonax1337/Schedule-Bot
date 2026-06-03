/**
 * Demo-mode toggle. Enabled when `VITE_DEV_MODE=true` is set at build
 * or dev time.
 *
 * When on:
 *  - install-mock-fetch.ts intercepts every /api/... fetch and returns
 *    fixture data so the UI is fully browsable with no backend.
 *  - The DemoBanner shows the current user (if any) plus actions to
 *    sign out or reset all demo data.
 *  - Auth is NOT pre-filled — the user starts on /login and goes
 *    through the (mocked) auth flow like a real visitor would.
 */

export const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'
