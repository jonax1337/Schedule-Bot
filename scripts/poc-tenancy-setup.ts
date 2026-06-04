/**
 * PoC multi-tenancy setup (idempotent).
 *
 * Run once before starting the app on the `poc/multi-tenancy` branch:
 *   npx tsx scripts/poc-tenancy-setup.ts
 *
 * It:
 *  1. Creates the `organizations` table and `organization_id` columns.
 *  2. Backfills all existing schedules/players into the "default" org.
 *  3. Swaps the global unique(date) for a per-org unique(organization_id, date).
 *  4. Seeds a second org "g2" with its own schedule data, so you can prove
 *     isolation in the dashboard by switching tenants.
 *
 * Uses raw SQL for DDL (bypasses the Prisma tenant guard) and the ORM inside an
 * org context for the g2 seed (which also exercises the guard's create-injection).
 */
import { prisma } from '../src/repositories/database.repository.js';
import { runWithOrg, requireOrgId } from '../src/shared/tenancy/orgContext.js';
import { formatDateToDDMMYYYY } from '../src/shared/utils/dateFormatter.js';

const DEFAULT_ORG = { id: 'org_default', slug: 'default', name: 'WGW Gold' };
const G2_ORG = { id: 'org_g2', slug: 'g2', name: 'G2 Esports' };

async function ddl(sql: string): Promise<void> {
  await prisma.$executeRawUnsafe(sql);
}

async function migrate(): Promise<void> {
  console.log('→ Creating organizations table…');
  await ddl(`
    CREATE TABLE IF NOT EXISTS organizations (
      id                 TEXT PRIMARY KEY,
      slug               TEXT NOT NULL UNIQUE,
      name               TEXT NOT NULL,
      discord_guild_id   TEXT UNIQUE,
      discord_channel_id TEXT,
      plan               TEXT NOT NULL DEFAULT 'free',
      created_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('→ Adding organization_id columns…');
  await ddl(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS organization_id TEXT;`);
  await ddl(`ALTER TABLE schedule_players ADD COLUMN IF NOT EXISTS organization_id TEXT;`);

  console.log('→ Upserting default + g2 organizations…');
  for (const org of [DEFAULT_ORG, G2_ORG]) {
    await ddl(`
      INSERT INTO organizations (id, slug, name, plan, created_at, updated_at)
      VALUES ('${org.id}', '${org.slug}', '${org.name.replace(/'/g, "''")}', 'free', now(), now())
      ON CONFLICT (slug) DO NOTHING;
    `);
  }

  console.log('→ Backfilling existing rows into the default org…');
  await ddl(`UPDATE schedules SET organization_id = '${DEFAULT_ORG.id}' WHERE organization_id IS NULL;`);
  await ddl(`UPDATE schedule_players SET organization_id = '${DEFAULT_ORG.id}' WHERE organization_id IS NULL;`);

  console.log('→ Enforcing NOT NULL…');
  await ddl(`ALTER TABLE schedules ALTER COLUMN organization_id SET NOT NULL;`);
  await ddl(`ALTER TABLE schedule_players ALTER COLUMN organization_id SET NOT NULL;`);

  console.log('→ Swapping global unique(date) for per-org unique(organization_id, date)…');
  await ddl(`ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_date_key;`);
  await ddl(`DROP INDEX IF EXISTS schedules_date_key;`);
  await ddl(`CREATE UNIQUE INDEX IF NOT EXISTS schedules_organization_id_date_key ON schedules(organization_id, date);`);
  await ddl(`CREATE INDEX IF NOT EXISTS schedules_organization_id_date_idx ON schedules(organization_id, date);`);
  await ddl(`CREATE INDEX IF NOT EXISTS schedule_players_organization_id_idx ON schedule_players(organization_id);`);

  console.log('✓ Migration done.');
}

const G2_ROSTER = [
  { userId: 'g2-1', displayName: 'hyped', role: 'MAIN' as const },
  { userId: 'g2-2', displayName: 'Sayf', role: 'MAIN' as const },
  { userId: 'g2-3', displayName: 'leo', role: 'MAIN' as const },
  { userId: 'g2-4', displayName: 'keloqz', role: 'MAIN' as const },
  { userId: 'g2-5', displayName: 'icy', role: 'MAIN' as const },
];

// Deterministic-ish availability per day so the dashboard visibly differs.
const G2_AVAIL = ['19:00-23:00', '20:00-23:00', 'x', '', '18:00-22:00', '19:00-23:00', 'x'];

async function seedG2(): Promise<void> {
  await runWithOrg(G2_ORG.id, async () => {
    const already = await prisma.schedule.findFirst({});
    if (already) {
      console.log('→ g2 already has schedule data, skipping seed.');
      return;
    }

    console.log('→ Seeding g2 schedules + roster…');
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const date = formatDateToDDMMYYYY(d);

      const schedule = await prisma.schedule.create({
        data: { date, reason: i === 3 ? 'Off day' : '', focus: i === 0 ? 'Ascent execs' : '', organizationId: requireOrgId() },
      });

      for (let p = 0; p < G2_ROSTER.length; p++) {
        const player = G2_ROSTER[p];
        // vary availability a bit per player so counts differ from the default org
        const avail = i === 3 ? 'x' : (p % 2 === 0 ? G2_AVAIL[i] : (G2_AVAIL[i] === '' ? '' : '20:00-23:00'));
        await prisma.schedulePlayer.create({
          data: {
            scheduleId: schedule.id,
            userId: player.userId,
            displayName: player.displayName,
            role: player.role,
            availability: avail,
            sortOrder: p,
            organizationId: requireOrgId(),
          },
        });
      }
    }
    console.log('✓ g2 seeded (7 days, 5 players).');
  });
}

async function main(): Promise<void> {
  await migrate();
  await seedG2();
  console.log('\n✅ PoC tenancy setup complete. Tenants: "default" (your data) + "g2" (seeded).');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('PoC setup failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
