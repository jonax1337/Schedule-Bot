# PoC Multi-Tenancy — Runbook

Branch: `poc/multi-tenancy`. Proves Schedule/SchedulePlayer isolation per org,
end-to-end through the dashboard. Design: `docs/saas-multitenancy-plan.md` §10b/§10c.

> ⚠️ Run against a **throwaway** Postgres, never the live Railway DB. The setup
> swaps the global `unique(date)` constraint and seeds a fake "g2" org.

## 1. Throwaway Postgres

Docker (simplest):
```bash
docker compose up -d db        # postgres on :5432 (schedule_bot / schedule_bot_user)
```
Then point the backend at it for this session (PowerShell):
```powershell
$env:DATABASE_URL = 'postgresql://schedule_bot_user:changeme@localhost:5432/schedule_bot?schema=public'
$env:POC_ALLOW_HEADER_TENANT = '1'   # honor X-Tenant locally (gated off by default)
$env:POC_DEFAULT_ORG_SLUG = 'default'
```

## 2. Create schema + seed two tenants
```bash
npx prisma db push                      # creates all tables incl. organizations + org_id
npx tsx scripts/poc-tenancy-setup.ts    # orgs "default" + "g2"; seeds g2 with 7 days
```
(`db push` on a fresh DB makes the setup's ALTER/backfill steps no-ops; on a DB
that already has data it migrates + backfills into "default".)

## 3. Run
```bash
npm run dev                       # backend :3001 (bot connects but won't post: no channel set locally)
cd dashboard && npm run dev       # dashboard :3000
```
Open http://localhost:3000, log in, use the **floating tenant switcher**
(bottom-right) to flip `default` ↔ `g2`. The schedule data changes per tenant.

## 4. Prove isolation (no browser, no Discord needed)
Two scripts assert isolation against the real DB. Set the env vars from step 1
(plus a dummy `DISCORD_TOKEN`/`DISCORD_GUILD_ID`/`ADMIN_USERNAME` and a `PORT`
that's free — the API port may be taken):
```bash
npx tsx scripts/poc-tenancy-validate.ts   # data layer: default vs g2 disjoint + fail-closed
PORT=3055 npx tsx scripts/poc-http-test.ts # boots the real Express API, proves X-Tenant isolation over HTTP
```
Both print `✅ … PROVEN`. Verified locally on PostgreSQL 16.

## What's already proven (no DB)
`npm test` runs `src/shared/tenancy/__tests__/guard.test.ts` (12 tests): the guard
injects organizationId on reads, stamps it on creates, scopes update/delete
authoritatively, rejects findUnique/upsert on tenant models, and throws
fail-closed when no org context is set.

## Security caveats (PoC only — see plan §8.3)
- `X-Tenant` is spoofable; honored only when `POC_ALLOW_HEADER_TENANT=1`.
  Production must derive the tenant from the verified subdomain **and** verify the
  authenticated user has a membership in that org. Not yet implemented (needs the
  Account/Membership model).
- Bot/scheduler/startup currently run in the **default** org only. Multi-guild /
  per-org cron and channel→team resolution are later phases.

## Teardown
```bash
docker compose down -v            # removes the throwaway DB volume
```
