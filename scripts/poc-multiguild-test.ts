/**
 * Multiple teams on one guild: channel→org resolution.
 *   npx tsx scripts/poc-multiguild-test.ts
 */
import { connectDatabase, disconnectDatabase } from '../src/repositories/database.repository.js';
import {
  setOrgChannel,
  getOrganizationByChannelId,
  getOrganizationsByGuildId,
} from '../src/repositories/organization.repository.js';

function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? '✓ PASS' : '✗ FAIL'} — ${msg}`);
  if (!cond) process.exitCode = 1;
}

async function main(): Promise<void> {
  await connectDatabase();

  // Two teams, distinct channels (as if sharing one guild).
  await setOrgChannel('org_default', 'chan-main-0001');
  await setOrgChannel('org_g2', 'chan-academy-0002');

  const main = await getOrganizationByChannelId('chan-main-0001');
  const academy = await getOrganizationByChannelId('chan-academy-0002');
  console.log(`channel chan-main-0001 → ${main?.slug}, chan-academy-0002 → ${academy?.slug}`);

  assert(main?.id === 'org_default', 'channel resolves to the Main team');
  assert(academy?.id === 'org_g2', 'channel resolves to the Academy team');
  assert((await getOrganizationByChannelId('chan-unknown')) === null, 'unknown channel resolves to nothing');

  // Same-guild grouping (bind both orgs to one guild for the count check).
  const { bindGuild } = await import('../src/repositories/organization.repository.js');
  await bindGuild('org_default', 'guild-shared-123');
  await bindGuild('org_g2', 'guild-shared-123');
  assert((await getOrganizationsByGuildId('guild-shared-123')).length === 2, 'a guild can host two teams');

  // Cleanup so local data isn't left mutated.
  await bindGuild('org_default', '');
  await bindGuild('org_g2', '');
  await setOrgChannel('org_default', '');
  await setOrgChannel('org_g2', '');

  await disconnectDatabase();
  console.log(`\n${process.exitCode ? '❌ MULTI-GUILD FAILED' : '✅ CHANNEL→ORG RESOLUTION PROVEN'}`);
}

main().catch(async (err) => {
  console.error('multi-guild test error:', err);
  process.exitCode = 1;
  await disconnectDatabase().catch(() => {});
});
