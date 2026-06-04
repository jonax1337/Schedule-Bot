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

async function players(tenant: string, token: string): Promise<string[]> {
  const res = await fetch(`${BASE}/api/schedule/next14`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant': tenant },
  });
  if (!res.ok) throw new Error(`${tenant}: HTTP ${res.status}`);
  const body = (await res.json()) as { schedules: { players: { userId: string }[] }[] };
  const ids = body.schedules.flatMap((s) => s.players.map((p) => p.userId));
  return [...new Set(ids)].sort();
}

function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? '✓ PASS' : '✗ FAIL'} — ${msg}`);
  if (!cond) process.exitCode = 1;
}

async function main(): Promise<void> {
  await connectDatabase();
  const server = startApiServer();
  await sleep(800);

  const token = generateToken('admin', 'admin');
  const def = await players('default', token);
  const g2 = await players('g2', token);

  console.log(`\nHTTP /api/schedule/next14`);
  console.log(`  X-Tenant: default -> [${def}]`);
  console.log(`  X-Tenant: g2      -> [${g2}]\n`);

  assert(def.length > 0 && g2.length > 0, 'both tenants return data over HTTP');
  assert(def.filter((p) => g2.includes(p)).length === 0, 'HTTP responses are disjoint per tenant');
  assert(def.every((p) => p.startsWith('wgw-')), 'default returns only WGW players');
  assert(g2.every((p) => p.startsWith('g2-')), 'g2 returns only G2 players');

  console.log(`\n${process.exitCode ? '❌ HTTP TEST FAILED' : '✅ HTTP ISOLATION PROVEN'}`);
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
