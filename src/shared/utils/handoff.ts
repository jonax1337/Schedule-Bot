import crypto from 'crypto';

/**
 * Single-use, short-lived login handoff codes. Used to deliver a freshly minted
 * session to a specific origin without putting a bearer token in a URL: the
 * source mints a code, the destination redeems it for a token. Bridges the
 * OAuth callback (on the neutral api host) to the context that started login
 * (control plane or a team subdomain) across origins.
 *
 * In-memory (single process). Codes live ~60s and are consumed immediately, so
 * the only loss window is a redeploy mid-login — the user just retries.
 */
export interface HandoffEntry {
  accountId: string;
  username: string;
  role: 'admin' | 'user';
  /** If set, redemption must supply the same csrf — binds the handoff to the
   *  browser session that initiated login (anti login-CSRF). */
  csrf?: string;
  expiresAt: number;
}

const handoffCodes = new Map<string, HandoffEntry>();
const HANDOFF_TTL_MS = 60_000;

export function mintHandoff(entry: Omit<HandoffEntry, 'expiresAt'>): string {
  const code = crypto.randomBytes(24).toString('hex');
  handoffCodes.set(code, { ...entry, expiresAt: Date.now() + HANDOFF_TTL_MS });
  return code;
}

/** Redeem (single-use). A csrf-bound code requires the matching csrf. */
export function redeemHandoff(code: string | undefined, csrf?: string): HandoffEntry | null {
  const entry = code ? handoffCodes.get(code) : undefined;
  if (entry) handoffCodes.delete(code!); // consume regardless of validity below
  if (!entry || entry.expiresAt < Date.now()) return null;
  if (entry.csrf && entry.csrf !== (csrf ?? '')) return null;
  return entry;
}
