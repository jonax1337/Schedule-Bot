# Migrationen

## Prisma Migrationen

Schedule-Bot nutzt **Prisma Migrate** fuer Datenbank-Migrationen.

## Befehle

### Entwicklung

```bash
# Neue Migration erstellen (nach Schema-Aenderung)
npm run db:migrate
# Alias fuer: prisma migrate dev

# Schema direkt pushen (ohne Migration)
npm run db:push
# Alias fuer: prisma db push
```

### Produktion

```bash
# Ausstehende Migrationen ausfuehren
npx prisma migrate deploy
```

### Prisma Client neu generieren

```bash
npm run db:generate
# Alias fuer: prisma generate
```

::: warning Nach Schema-Aenderungen
Nach jeder Aenderung an `prisma/schema.prisma` muss der Prisma Client neu generiert werden:
```bash
npm run db:generate
```
:::

## Prisma Studio

Visueller Datenbank-Editor:

```bash
npm run db:studio
```

Oeffnet eine Web-Oberflaeche zum direkten Bearbeiten der Datenbank-Daten.

## Migrations-Verzeichnis

Migrationen werden in `prisma/migrations/` gespeichert:

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

## Docker-Deployment

Im Dockerfile werden Migrationen automatisch beim Start ausgefuehrt:

```sh
(npx prisma migrate deploy || npx prisma db push --accept-data-loss) && node dist/index.js
```

Falls Migrationen fehlschlagen, wird als Fallback `db push` verwendet.

## Prisma-Konfiguration

Die Prisma-Konfiguration liegt in `prisma.config.ts`:

```typescript
// Schema-Pfad
schema: 'prisma/schema.prisma'

// Migrations-Pfad
migrations: 'prisma/migrations'

// Datenquelle
datasource: DATABASE_URL
```

## Erste Einrichtung

Bei einer komplett neuen Datenbank:

```bash
# 1. Datenbank erstellen (falls nicht vorhanden)
createdb schedule_bot

# 2. Migrationen ausfuehren
npm run db:migrate

# 3. (Optional) Prisma Client generieren
npm run db:generate
```

Der Bot initialisiert beim ersten Start automatisch Default-Settings und Seed-Daten ueber `initializeDatabaseIfEmpty()`.
