/**
 * #4 Stage 1: prove the config singleton is now per-org (context-aware).
 *   npx tsx scripts/poc-orgconfig-test.ts
 */
import { connectDatabase, disconnectDatabase } from '../src/repositories/database.repository.js';
import { config, getOrgConfig } from '../src/shared/config/config.js';
import { runWithOrg } from '../src/shared/tenancy/orgContext.js';
import { getSettingsForCurrentOrg, saveSettingsForCurrentOrg } from '../src/shared/utils/settingsManager.js';

const DEFAULT = 'org_default';
const G2 = 'org_g2';

async function setPostTime(orgId: string, time: string): Promise<void> {
  await runWithOrg(orgId, async () => {
    const s = await getSettingsForCurrentOrg();
    s.scheduling.dailyPostTime = time;
    await saveSettingsForCurrentOrg(s);
  });
}

function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? '✓ PASS' : '✗ FAIL'} — ${msg}`);
  if (!cond) process.exitCode = 1;
}

async function main(): Promise<void> {
  await connectDatabase();

  await setPostTime(DEFAULT, '18:00');
  await setPostTime(G2, '20:00');

  // Warm both orgs' runtime config.
  await getOrgConfig(DEFAULT);
  await getOrgConfig(G2);

  const def = runWithOrg(DEFAULT, () => config.scheduling.dailyPostTime);
  const g2 = runWithOrg(G2, () => config.scheduling.dailyPostTime);
  console.log(`config.scheduling.dailyPostTime  default=${def}  g2=${g2}`);

  assert(def === '18:00', 'config resolves the default org post time');
  assert(g2 === '20:00', 'config resolves the g2 org post time');
  assert(def !== g2, 'config is per-org (no shared singleton)');

  await disconnectDatabase();
  console.log(`\n${process.exitCode ? '❌ ORG-CONFIG FAILED' : '✅ PER-ORG CONFIG PROVEN'}`);
}

main().catch(async (err) => {
  console.error('org-config test error:', err);
  process.exitCode = 1;
  await disconnectDatabase().catch(() => {});
});
