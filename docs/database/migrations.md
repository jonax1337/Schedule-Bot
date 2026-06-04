# Migrations

## Prisma Migrations

Synqed uses **Prisma Migrate** for database migrations.

## Commands

### Development

```bash
# Create a new migration (after a schema change)
npm run db:migrate
# Alias for: prisma migrate dev

# Push the schema directly (without a migration)
npm run db:push
# Alias for: prisma db push
```

### Production

```bash
# Apply pending migrations
npx prisma migrate deploy
```

### Regenerate the Prisma Client

```bash
npm run db:generate
# Alias for: prisma generate
```

::: warning After schema changes
The Prisma Client must be regenerated after every change to `prisma/schema.prisma`:
```bash
npm run db:generate
```
:::

## Prisma Studio

Visual database editor:

```bash
npm run db:studio
```

Opens a web UI for editing database records directly.

## Migrations Directory

Migrations are stored in `prisma/migrations/`:

```
prisma/
├── schema.prisma
├── migrations/
│   ├── 20240101000000_init/
│   │   └── migration.sql
│   ├── 20240115000000_add_absences/
│   │   └── migration.sql
│   └── ...
└── ...
```

## Docker Deployment

In the Dockerfile, migrations are applied automatically on startup:

```sh
(npx prisma migrate deploy || npx prisma db push --accept-data-loss) && node dist/index.js
```

If migrations fail, `db push` is used as a fallback.

## Prisma Configuration

The Prisma configuration lives in `prisma.config.ts`:

```typescript
// Schema path
schema: 'prisma/schema.prisma'

// Migrations path
migrations: 'prisma/migrations'

// Data source
datasource: DATABASE_URL
```

## Initial Setup

For a brand-new database:

```bash
# 1. Create the database (if it doesn't exist)
createdb schedule_bot

# 2. Run migrations
npm run db:migrate

# 3. (Optional) Generate the Prisma Client
npm run db:generate
```

On first startup, the bot automatically initializes default settings and seed data via `initializeDatabaseIfEmpty()`.
