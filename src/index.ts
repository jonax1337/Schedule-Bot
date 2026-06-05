import { startBot, client } from './bot/client.js';
import { startScheduler, stopScheduler, getNextScheduledTime } from './jobs/scheduler.js';
import { connectDatabase, disconnectDatabase } from './repositories/database.repository.js';
import { getDefaultOrgId } from './repositories/organization.repository.js';
import { runWithOrg } from './shared/tenancy/orgContext.js';
import { config, reloadConfig } from './shared/config/config.js';
import { startApiServer } from './api/server.js';
import { logger, getErrorMessage } from './shared/utils/logger.js';

async function main(): Promise<void> {
  logger.info('Synqed starting');

  // Connect to PostgreSQL Database
  try {
    await connectDatabase();
  } catch (error) {
    logger.error('PostgreSQL connection failed', getErrorMessage(error));
    process.exit(1);
  }

  // Multi-tenancy (PoC): the bot/scheduler/startup operate on the default org.
  // Everything below that touches tenant data runs inside its context so the
  // Prisma guard can scope queries. (Later: per-org loop / guildId resolution.)
  // A fresh SaaS database has no organizations yet — the first team is created
  // through the control plane. Boot the API regardless so that flow works; only
  // run the org-scoped startup (settings load, schedule seeding) when a default
  // org actually exists. The scheduler iterates all orgs, so zero orgs is a no-op.
  let defaultOrgId: string | null = null;
  try {
    defaultOrgId = await getDefaultOrgId();
  } catch {
    logger.warn('No default organization yet', 'Booting control-plane only — create the first team via the control plane.');
  }

  if (defaultOrgId) await runWithOrg(defaultOrgId, async () => {
    // Initialize database if empty
    try {
      const { initializeDatabaseIfEmpty } = await import('./repositories/database-initializer.js');
      await initializeDatabaseIfEmpty();
    } catch (error) {
      logger.error('Database initialization failed', getErrorMessage(error));
    }

    // Load settings from PostgreSQL
    try {
      await reloadConfig();
      logger.success('Settings loaded', `Post time: ${config.scheduling.dailyPostTime}, Timezone: ${config.scheduling.timezone}`);
    } catch (error) {
      logger.error('Settings load failed', getErrorMessage(error));
    }

    // Materialize the seeding window and reconcile the roster.
    // syncUserMappingsToSchedules backfills missing players into existing
    // (past + future) schedules so historical counts reflect the current
    // team, and prunes departed players from future schedules only.
    try {
      const {
        addMissingDays,
        applyRecurringToEmptySchedules,
        syncUserMappingsToSchedules,
      } = await import('./repositories/schedule.repository.js');
      await addMissingDays();
      await syncUserMappingsToSchedules();
      await applyRecurringToEmptySchedules();
    } catch (error) {
      logger.error('Schedule verification failed', getErrorMessage(error));
    }
  });

  // Start API server early so healthchecks pass while bot connects
  startApiServer();

  // Local PoC: run API-only (no Discord login, no scheduler) so the dashboard
  // can be developed against the local DB without touching the real guild.
  if (process.env.DISABLE_BOT === '1') {
    logger.warn('Bot disabled', 'DISABLE_BOT=1 — API only (no Discord, no scheduler)');
    return;
  }

  logger.info('Starting Discord bot');
  await startBot();

  // Wait for bot to be ready before starting scheduler
  client.once('clientReady', async () => {
    logger.success('Discord bot ready', `Logged in as ${client.user?.tag}`);

    startScheduler();

    const nextRun = getNextScheduledTime();
    if (nextRun) {
      logger.info('Next scheduled post', nextRun.toLocaleString('de-DE'));
    }

    // The pinned weekly overview is per-org; only the default org (if any) has
    // one to refresh at boot. Fresh SaaS instances skip this until a team exists.
    if (defaultOrgId) {
      await runWithOrg(defaultOrgId, async () => {
        try {
          const { refreshWeeklyOverview } = await import('./bot/utils/weekly-overview.js');
          await refreshWeeklyOverview(client);
        } catch (error) {
          logger.error('Initial weekly overview refresh failed', getErrorMessage(error));
        }
      });
    }

    logger.success('Startup complete');
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down (SIGINT)');
  stopScheduler();
  client.destroy();
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down (SIGTERM)');
  stopScheduler();
  client.destroy();
  await disconnectDatabase();
  process.exit(0);
});

main().catch(error => {
  logger.error('Fatal error', getErrorMessage(error));
  process.exit(1);
});
