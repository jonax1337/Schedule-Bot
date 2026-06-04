/**
 * Control-plane flow test: dev-login → create team → list, plus slug validation.
 *   ALLOW_DEV_LOGIN=1 PORT=3056 npx tsx scripts/poc-controlplane-test.ts
 */
import { connectDatabase, disconnectDatabase, prisma } from '../src/repositories/database.repository.js';
import { startApiServer } from '../src/api/server.js';

const BASE = `http://localhost:${process.env.PORT || 3001}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(path: string, body: unknown, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as any };
}

function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? '✓ PASS' : '✗ FAIL'} — ${msg}`);
  if (!cond) process.exitCode = 1;
}

async function main(): Promise<void> {
  await connectDatabase();
  // clean any leftover from a previous run
  await prisma.membership.deleteMany({ where: { organization: { slug: 'pocnew' } } });
  await prisma.organization.deleteMany({ where: { slug: 'pocnew' } });

  const server = startApiServer();
  await sleep(800);

  const login = await post('/api/platform/account/dev-login', { displayName: 'PoC Tester' });
  assert(login.status === 200 && !!login.body.token, 'dev-login returns a token');
  const token = login.body.token as string;

  const ok = await post('/api/platform/organizations', { slug: 'pocnew', name: 'PoC New Team' }, token);
  assert(ok.status === 200 && ok.body.organization?.slug === 'pocnew', 'create team "pocnew" succeeds');

  const bad = await post('/api/platform/organizations', { slug: 'AB' }, token);
  assert(bad.status === 400, 'invalid slug rejected (400)');

  const reserved = await post('/api/platform/organizations', { slug: 'admin' }, token);
  assert(reserved.status === 400, 'reserved slug rejected (400)');

  const taken = await post('/api/platform/organizations', { slug: 'g2' }, token);
  assert(taken.status === 400, 'taken slug "g2" rejected (400)');

  const list = await fetch(`${BASE}/api/platform/orgs`, { headers: { Authorization: `Bearer ${token}` } });
  const orgs = ((await list.json()) as { organizations: { slug: string; role: string }[] }).organizations;
  const mine = orgs.find((o) => o.slug === 'pocnew');
  assert(!!mine && mine.role === 'OWNER', 'new team appears in my orgs as OWNER');

  console.log(`\n${process.exitCode ? '❌ CONTROL-PLANE TEST FAILED' : '✅ CONTROL-PLANE FLOW PROVEN'}`);

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error('control-plane test error:', err);
  process.exitCode = 1;
  await disconnectDatabase().catch(() => {});
});
