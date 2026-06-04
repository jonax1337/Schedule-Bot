/**
 * PoC HTTP isolation test. Boots the REAL Express API in-process and hits it
 * over localhost as two tenants, proving the full request path (tenant
 * middleware → AsyncLocalStorage → guarded Prisma) isolates data.
 *
 *   npx tsx scripts/poc-http-test.ts
 * (requires env: DATABASE_URL, JWT_SECRET, POC_ALLOW_HEADER_TENANT=1, and the
 *  dummy DISCORD_TOKEN/DISCORD_GUILD_ID/ADMIN_USERNAME that config.ts requires)
 */
import { connectDatabase, disconnectDatabase } from '../src/repositories/database.repository.js';
import { startApiServer } from '../src/api/server.js';
import { generateToken } from '../src/shared/middleware/auth.js';

const BASE = `http://localhost:${process.env.PORT || 3001}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function req(tenant: string, token: string): Promise<{ status: number; ids: string[] }> {
  const res = await fetch(`${BASE}/api/schedule/next14`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant': tenant },
  });
  if (!res.ok) return { status: res.status, ids: [] };
  const body = (await res.json()) as { schedules: { players: { userId: string }[] }[] };
  const ids = [...new Set(body.schedules.flatMap((s) => s.players.map((p) => p.userId)))].sort();
  return { status: res.status, ids };
}

function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? '✓ PASS' : '✗ FAIL'} — ${msg}`);
  if (!cond) process.exitCode = 1;
}

async function main(): Promise<void> {
  await connectDatabase();
  const server = startApiServer();
  await sleep(800);

  // Owner account is a member of both orgs; g2-only account only of g2.
  const owner = generateToken('admin', 'admin', 'acc_owner');
  const g2only = generateToken('g2user', 'user', 'acc_g2only');

  const ownerDefault = await req('default', owner);
  const ownerG2 = await req('g2', owner);
  const g2onlyG2 = await req('g2', g2only);
  const g2onlyDefault = await req('default', g2only); // must be denied

  console.log(`\nHTTP /api/schedule/next14`);
  console.log(`  owner   X-Tenant=default -> ${ownerDefault.status} [${ownerDefault.ids}]`);
  console.log(`  owner   X-Tenant=g2      -> ${ownerG2.status} [${ownerG2.ids}]`);
  console.log(`  g2only  X-Tenant=g2      -> ${g2onlyG2.status} [${g2onlyG2.ids}]`);
  console.log(`  g2only  X-Tenant=default -> ${g2onlyDefault.status} (expect 403)\n`);

  // Tenant isolation
  assert(ownerDefault.ids.every((p) => p.startsWith('wgw-')) && ownerDefault.ids.length > 0, 'default returns only WGW players');
  assert(ownerG2.ids.every((p) => p.startsWith('g2-')) && ownerG2.ids.length > 0, 'g2 returns only G2 players');
  assert(ownerDefault.ids.filter((p) => ownerG2.ids.includes(p)).length === 0, 'tenant responses are disjoint');
  // Membership enforcement (IDOR closed)
  assert(g2onlyG2.status === 200 && g2onlyG2.ids.length > 0, 'g2-only account CAN read its own org (g2)');
  assert(g2onlyDefault.status === 403, 'g2-only account is DENIED the default org (spoofed X-Tenant rejected)');

  // Org switcher data source: /api/platform/orgs returns only the account's orgs
  const orgSlugs = async (token: string): Promise<string[]> => {
    const res = await fetch(`${BASE}/api/platform/orgs`, { headers: { Authorization: `Bearer ${token}`, 'X-Tenant': 'default' } });
    const body = (await res.json()) as { organizations: { slug: string }[] };
    return (body.organizations ?? []).map((o) => o.slug).sort();
  };
  const ownerOrgs = await orgSlugs(owner);
  const g2onlyOrgs = await orgSlugs(g2only);
  console.log(`\n/api/platform/orgs  owner=[${ownerOrgs}]  g2only=[${g2onlyOrgs}]`);
  assert(ownerOrgs.join() === 'default,g2', 'owner switcher lists both orgs');
  assert(g2onlyOrgs.join() === 'g2', 'g2-only switcher lists only g2');

  console.log(`\n${process.exitCode ? '❌ HTTP TEST FAILED' : '✅ ISOLATION + MEMBERSHIP + SWITCHER PROVEN'}`);
  // Clean teardown: close the server + pool and let the loop drain (no
  // process.exit — that races libuv handle close on Windows).
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error('http test error:', err);
  process.exitCode = 1;
  await disconnectDatabase().catch(() => {});
});
