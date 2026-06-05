/**
 * "Add to Discord" flow test: build invite (signed state) → simulate Discord's
 * callback → guild bound to the org.
 *   ALLOW_DEV_LOGIN=1 DISCORD_CLIENT_ID=local-dummy-client-id PORT=3056 \
 *     npx tsx scripts/poc-discord-invite-test.ts
 */
import { connectDatabase, disconnectDatabase, prisma } from '../src/repositories/database.repository.js';
import { startApiServer } from '../src/api/server.js';

const BASE = `http://localhost:${process.env.PORT || 3001}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? '✓ PASS' : '✗ FAIL'} — ${msg}`);
  if (!cond) process.exitCode = 1;
}

async function main(): Promise<void> {
  await connectDatabase();
  await prisma.membership.deleteMany({ where: { organization: { slug: 'invtest' } } });
  await prisma.organization.deleteMany({ where: { slug: 'invtest' } });

  const server = startApiServer();
  await sleep(800);

  const login = await (await fetch(`${BASE}/api/platform/account/dev-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: 'Inv Tester' }),
  })).json();
  const token = login.token as string;
  const auth = { Authorization: `Bearer ${token}` };

  await fetch(`${BASE}/api/platform/organizations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ slug: 'invtest', name: 'Invite Test' }),
  });

  const invite = await (await fetch(`${BASE}/api/platform/organizations/invtest/invite`, { headers: auth })).json();
  assert(!!invite.url && invite.url.includes('discord.com/oauth2/authorize'), 'invite URL is built');
  const state = invite.url ? new URL(invite.url).searchParams.get('state') : null;
  assert(!!state, 'invite URL carries a signed state');
  assert(invite.url?.includes('permissions=216128'), 'invite requests the expected permission bitmask');

  // Simulate Discord's redirect back after the bot is added.
  const cb = await fetch(`${BASE}/api/platform/discord/bot-callback?state=${state}&guild_id=999888777`, { redirect: 'manual' });
  assert(cb.status === 302 && (cb.headers.get('location') || '').includes('bot=connected'), 'callback redirects with success');

  const org = await prisma.organization.findUnique({ where: { slug: 'invtest' }, select: { discordGuildId: true } });
  assert(org?.discordGuildId === '999888777', 'guild is bound to the org');

  // A tampered/invalid state must not bind anything.
  const bad = await fetch(`${BASE}/api/platform/discord/bot-callback?state=garbage&guild_id=111`, { redirect: 'manual' });
  assert(bad.status === 302 && (bad.headers.get('location') || '').includes('bot=error'), 'invalid state rejected');

  console.log(`\n${process.exitCode ? '❌ INVITE FLOW FAILED' : '✅ ADD-TO-DISCORD FLOW PROVEN'}`);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error('invite test error:', err);
  process.exitCode = 1;
  await disconnectDatabase().catch(() => {});
});
