/**
 * PoC isolation validation (data layer). Run after poc-tenancy-setup.ts:
 *   npx tsx scripts/poc-tenancy-validate.ts
 *
 * Seeds the default org with its own roster (if empty), then proves:
 *  - each org sees only its own schedules/players (no cross-tenant bleed),
 *  - querying a tenant model with NO org context throws (fail-closed).
 */
import { prisma } from '../src/repositories/database.repository.js';
import { runWithOrg, requireOrgId } from '../src/shared/tenancy/orgContext.js';
import { getSettingsForCurrentOrg, saveSettingsForCurrentOrg } from '../src/shared/utils/settingsManager.js';
import { formatDateToDDMMYYYY } from '../src/shared/utils/dateFormatter.js';

const DEFAULT_ORG = 'org_default';
const G2_ORG = 'org_g2';

const WGW_ROSTER = ['Jonas', 'Leon', 'Max', 'Tim', 'Paul'];

async function seedDefaultIfEmpty(): Promise<void> {
  await runWithOrg(DEFAULT_ORG, async () => {
    if (await prisma.schedule.findFirst({})) return;
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const schedule = await prisma.schedule.create({
        data: { date: formatDateToDDMMYYYY(d), reason: '', focus: '', organizationId: requireOrgId() },
      });
      for (let p = 0; p < WGW_ROSTER.length; p++) {
        await prisma.schedulePlayer.create({
          data: {
            scheduleId: schedule.id, userId: `wgw-${p + 1}`, displayName: WGW_ROSTER[p],
            role: 'MAIN', availability: '18:00-22:00', sortOrder: p, organizationId: requireOrgId(),
          },
        });
      }
    }
    console.log('→ Seeded default org (5 days, WGW roster).');
  });
}

async function snapshot(orgId: string) {
  return runWithOrg(orgId, async () => {
    const schedules = await prisma.schedule.findMany({ include: { players: true } });
    const players = schedules.flatMap((s) => s.players.map((p) => p.userId));
    return { schedules: schedules.length, players: [...new Set(players)].sort() };
  });
}

function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? '✓ PASS' : '✗ FAIL'} — ${msg}`);
  if (!cond) process.exitCode = 1;
}

async function main(): Promise<void> {
  await seedDefaultIfEmpty();

  const def = await snapshot(DEFAULT_ORG);
  const g2 = await snapshot(G2_ORG);
  console.log(`\ndefault: ${def.schedules} schedules, players=[${def.players}]`);
  console.log(`g2:      ${g2.schedules} schedules, players=[${g2.players}]\n`);

  // 1. Both tenants have their own data
  assert(def.schedules > 0 && g2.schedules > 0, 'both tenants have schedules');

  // 2. No cross-tenant bleed: player sets are disjoint
  const overlap = def.players.filter((p) => g2.players.includes(p));
  assert(overlap.length === 0, `player rosters are disjoint (overlap=[${overlap}])`);

  // 3. g2's known players are invisible from the default context
  assert(!def.players.some((p) => p.startsWith('g2-')), 'default org cannot see g2 players');
  assert(g2.players.every((p) => p.startsWith('g2-')), 'g2 org sees only its own players');

  // 4. New tenant tables also scope: user_mappings is now per-org.
  const umDefault = await runWithOrg(DEFAULT_ORG, async () => { return await prisma.userMapping.count(); });
  const umG2 = await runWithOrg(G2_ORG, async () => { return await prisma.userMapping.count(); });
  console.log(`user_mappings  default=${umDefault}  g2=${umG2}`);
  assert(umDefault > 0 && umG2 === 0, 'user_mappings scoped per org (default has roster, g2 empty)');

  // 5. settings are now per-org too.
  const setTeamName = (org: string, name: string) =>
    runWithOrg(org, async () => {
      const s = await getSettingsForCurrentOrg();
      s.branding.teamName = name;
      await saveSettingsForCurrentOrg(s);
    });
  await setTeamName(DEFAULT_ORG, 'WGW Gold');
  await setTeamName(G2_ORG, 'G2 Esports');
  const defName = await runWithOrg(DEFAULT_ORG, async () => (await getSettingsForCurrentOrg()).branding.teamName);
  const g2Name = await runWithOrg(G2_ORG, async () => (await getSettingsForCurrentOrg()).branding.teamName);
  console.log(`settings.teamName  default="${defName}"  g2="${g2Name}"`);
  assert(defName === 'WGW Gold' && g2Name === 'G2 Esports', 'settings (teamName) are isolated per org');

  // 6. Fail-closed: a tenant query with NO org context must throw
  let threw = false;
  try {
    await prisma.schedule.findMany({});
  } catch {
    threw = true;
  }
  assert(threw, 'querying Schedule with no org context throws (fail-closed)');

  console.log(`\n${process.exitCode ? '❌ VALIDATION FAILED' : '✅ ISOLATION PROVEN'}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('validation error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
