# Synqed — Multi-Tenancy / SaaS Plan

> Ziel: Aus dem Single-Team-Bot ein SaaS machen. Mehrere Teams auf **einer**
> Railway-Instanz, **einem** Bot, **einem** Postgres. Teams via Subdomain
> (`g2.synqed.org`, `wgw-gold.synqed.org`). Control Plane auf `synqed.org`.
>
> **Entscheidungen (fix):**
> - Account-Modell: **Ein Synqed-Account → mehrere Teams** (Org-Switcher).
> - Jetzt: **nur Planung**, kein Code.
> - Billing: **später** (Kunden anfangs manuell freischalten).
>
> Tenancy-Modell: **Shared Database, Shared Schema** mit `organization_id`
> auf jeder team-spezifischen Tabelle (Pool-Model). Günstig, ein Deploy,
> passt zur Skala (E-Sport-Teams, nicht Enterprise-Compliance).

---

## 1. Big Picture

```
                      Cloudflare (*.synqed.org, Wildcard-TLS)
                                   │
                 ┌─────────────────┼──────────────────┐
                 │                 │                  │
        synqed.org          g2.synqed.org      wgw-gold.synqed.org
        (Control Plane)     (Team-Dashboard)   (Team-Dashboard)
                 │                 │                  │
                 └────────── selber SPA-Build ────────┘
                                   │  X-Tenant: <slug>
                                   ▼
                    Railway: 1 Backend-Service
                    ├── Express API (:3001)  ──► Tenant-Resolver-Middleware
                    └── Discord Bot (1 Token) ──► guildId → Org
                                   │
                                   ▼
                         1 Postgres (org_id überall)
```

Kernidee: **Tenant = Organization**. Eine Org hat genau einen Discord-Server
(`guildId`) und genau eine Subdomain (`slug`). Ein Account (Person) kann Mitglied
mehrerer Orgs sein.

---

## 2. Datenmodell-Änderungen (Prisma)

### 2.1 Neue Tabellen

```prisma
model Organization {
  id              String   @id @default(cuid())
  slug            String   @unique           // → Subdomain (g2, wgw-gold)
  name            String
  discordGuildId  String?  @unique @map("discord_guild_id")  // null bis Bot eingeladen
  discordChannelId String? @map("discord_channel_id")
  plan            String   @default("free")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  memberships     Membership[]
  // + Relations zu allen team-Tabellen unten
  @@map("organizations")
}

model Account {                              // globaler Synqed-User
  id          String   @id @default(cuid())
  email       String?  @unique
  discordId   String?  @unique @map("discord_id")
  displayName String   @map("display_name")
  createdAt   DateTime @default(now()) @map("created_at")

  memberships Membership[]
  @@map("accounts")
}

model Membership {                           // Account ↔ Org (N:M, mit Rolle)
  id             String   @id @default(cuid())
  accountId      String   @map("account_id")
  organizationId String   @map("organization_id")
  role           OrgRole  @default(ADMIN)    // OWNER | ADMIN | MEMBER
  createdAt      DateTime @default(now()) @map("created_at")

  account      Account      @relation(fields: [accountId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([accountId, organizationId])
  @@map("memberships")
}

enum OrgRole { OWNER ADMIN MEMBER }
```

### 2.2 `organization_id` auf bestehende Tabellen

Auf **jede** team-spezifische Tabelle: `organizationId String @map("organization_id")`
+ Relation + `@@index([organizationId])`.

| Tabelle | org_id direkt? | Hinweis |
|---|---|---|
| `schedules` | ✅ | |
| `schedule_players` | ✅ (denormalisiert) | technisch via `schedule` ableitbar, aber direkt nötig für Queries nach `userId` + für Prisma-Guard |
| `user_mappings` | ✅ | |
| `scrims` | ✅ | |
| `vod_comments` | ✅ (denormalisiert) | via `scrim` ableitbar, direkt für Guard |
| `absences` | ✅ | |
| `recurring_availabilities` | ✅ | |
| `settings` | ✅ | wird pro-Org (siehe §4) |
| `strategy_folders` | ✅ | |
| `strategies` | ✅ | |
| `strategy_images` | ✅ (denormalisiert) | via `strategy` ableitbar |
| `strategy_files` | ✅ (denormalisiert) | via `strategy` ableitbar |

**Faustregel:** Tabellen mit direkten Lookups (nach `userId`, `date` etc.) oder
die im Prisma-Guard erscheinen sollen → `org_id` direkt drauf, auch wenn
ableitbar. Reine Child-Tabellen mit Cascade (`vod_comments`) könnte man weglassen,
aber konsequentes `org_id`-überall macht den Guard wasserdicht.

### 2.3 ⚠️ Unique-Constraints, die unter Multi-Tenancy brechen

Das ist der subtilste Teil — diese sind **global unique** und müssen
**pro Org** werden, sonst kollidieren zwei Teams:

| Aktuell | Neu |
|---|---|
| `Schedule.date @unique` | `@@unique([organizationId, date])` |
| `UserMapping.discordId @unique` | `@@unique([organizationId, discordId])` |
| `RecurringAvailability @@unique([userId, dayOfWeek])` | `@@unique([organizationId, userId, dayOfWeek])` |
| `Setting.key @unique` | `@@unique([organizationId, key])` |
| `StrategyFolder @@unique([parentId, name])` | `@@unique([organizationId, parentId, name])` |
| `StrategyImage/File.filename @unique` | bleibt global (UUID-Dateinamen) — OK |

> **Achtung Discord-ID:** Derselbe Spieler (gleiche `discordId`) kann jetzt in
> mehreren Teams sein. `discordId` ist also **nicht mehr** global unique —
> nur noch pro Org. Code, der `findUnique({ where: { discordId } })` macht,
> muss auf `findFirst({ where: { organizationId, discordId } })` umgestellt
> werden. (Betrifft `user-mapping.routes.ts`, `discord.routes.ts`.)

### 2.4 Migration der Bestandsdaten

1. `organizations` + erste Org für das aktuelle Team anlegen (Backfill).
2. Allen Bestandszeilen diese eine `organization_id` zuweisen.
3. Erst danach `org_id` auf `NOT NULL` setzen.

→ als reguläre Prisma-Migration mit Data-Backfill-Step.

---

## 3. Org-Scoping erzwingen (das Haupt-Risiko: Daten-Leakage)

**Niemals** `org_id` 50× von Hand in jede Query schreiben — einmal vergessen =
Team A sieht Team B. Stattdessen zentral erzwingen:

### Empfohlen: Prisma Client Extension pro Request

```ts
// Pseudocode
function prismaForOrg(orgId: string) {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (TENANT_MODELS.has(model)) {
            // read: where org_id injecten
            // create: data.organizationId setzen
            args = injectOrgScope(args, operation, orgId);
          }
          return query(args);
        },
      },
    },
  });
}
```

- API-Layer: pro Request `req.db = prismaForOrg(req.org.id)`.
- Repositories nehmen den **scoped client** als Parameter (statt globalem
  `prisma`-Import). Das ist der größte mechanische Umbau: alle 9 Repos.
- Bot-Layer: `prismaForOrg(org.id)` nach guildId-Auflösung.

**Alternative (einfacher, weniger sicher):** Repository-Funktionen bekommen
`orgId` als Pflicht-Parameter und setzen `where` manuell. Mehr Boilerplate,
vergisst man leichter. → Extension bevorzugen.

---

## 4. Config & Settings: vom globalen Singleton zu pro-Org

**Heute (`config.ts`):** ein einziges, prozessweites `config`-Objekt, gefüllt aus
`loadSettings()`. `reloadConfig()` mutiert dieses eine Objekt. Das funktioniert
für **ein** Team — bei N Teams brauchst du N Settings-Sätze.

**Neu:**
- `settings`-Tabelle wird pro-Org (`@@unique([organizationId, key])`).
- `loadSettings()` → `loadSettings(orgId)`.
- `config`-Singleton → `getOrgConfig(orgId)` mit In-Memory-Cache
  (`Map<orgId, OrgConfig>`), Invalidierung bei `POST /api/settings`.
- Env-Vars trennen in:
  - **Global / Plattform:** `DISCORD_TOKEN`, `DATABASE_URL`, `JWT_SECRET`,
    `DISCORD_CLIENT_ID/SECRET` (ein Bot, eine App) → bleiben Env.
  - **Pro-Org (heute Env, wird DB):** `DISCORD_GUILD_ID`, `channelId`,
    Post-Zeiten, Timezone, Branding, Stratbook-Permissions → in `organizations`
    bzw. `settings` pro Org.

`DISCORD_GUILD_ID` als Env-Var **entfällt** komplett — die Guild-ID lebt jetzt
pro Org in der DB (`organizations.discord_guild_id`).

---

## 5. Bot: ein Token, viele Guilds

Discord-Bots sind von Natur aus multi-guild. Umbau:

- **`ready.event.ts`:** Slash-Commands global registrieren (nicht mehr
  guild-spezifisch auf eine `GUILD_ID`).
- **`interactionCreate`:** ganz am Anfang `interaction.guildId` → Org auflösen
  (gecachte `Map<guildId, Organization>`). Wenn keine Org → freundliche
  "Server nicht verknüpft"-Antwort. Dann alle Handler org-scoped.
- **`guildCreate`-Event:** Bot wurde neu eingeladen → Org via OAuth-`state`
  oder Setup-Flow verknüpfen (siehe §7).
- **`guildDelete`:** Bot entfernt → Org markieren (nicht hart löschen).
- Alle Repository-Calls im Bot bekommen den scoped client.

---

## 6. Scheduler: ein Cron-Loop über alle Orgs

**Heute:** feste Cron-Jobs aus dem globalen `config` (eine Post-Zeit, eine TZ,
ein Channel).

**Problem:** Jede Org hat eigene Post-Zeit, Timezone, Channel, Weekly-Ping-Tage.

**Zwei Optionen:**

| Ansatz | Beschreibung | Bewertung |
|---|---|---|
| **A: Minuten-Tick** | Ein `* * * * *`-Cron, das jede Minute alle Orgs durchgeht und prüft "ist jetzt die Post-Zeit dieser Org (in ihrer TZ)?" | Einfach, robust, skaliert gut bis viele hundert Orgs. **Empfohlen.** |
| **B: Dynamische Jobs pro Org** | Pro Org eigene `cron.schedule`-Instanzen, neu aufgebaut bei Settings-Änderung | Mehr State, mehr Komplexität, mehr Fehlerquellen |

→ **Option A.** `startScheduler()` wird zu einem Tick, der pro Org die fällige
Aktion (Post / Reminder / Weekly-Ping) anhand der Org-Settings ausführt.
`postScheduleToChannel()` etc. bekommen `orgId` als Parameter.

---

## 7. Onboarding-Flow (Easy Setup)

```
1. User → synqed.org → Sign up (Discord-Login → Account)
2. "Create team" → slug wählen (g2) → Org + Membership(OWNER) angelegt
3. "Add bot to Discord" → Discord OAuth2 Bot-Invite
      scope=bot+applications.commands, state=<orgId signiert>
4. Discord redirect → /api/discord/callback?guild_id=...&state=...
      → state verifizieren → organizations.discord_guild_id = guild_id
      → Org ist jetzt mit Server verknüpft (automatisch, kein Copy-Paste!)
5. Redirect → g2.synqed.org → Setup-Wizard:
      Channel wählen · Post-Zeit · Timezone · Roster importieren
6. Fertig.
```

Discords Bot-Invite-Flow liefert `guild_id` an die Redirect-URI zurück → damit
binden wir den Server **automatisch** an die richtige Org. Das ist deutlich
einfacher als der heutige manuelle `DISCORD_GUILD_ID`-Env-Eintrag.

---

## 7b. Bot-Invite, Permissions & Auth-Vereinfachung

### Bot zum Server hinzufügen
Discord erledigt Autorisierung & Permission-Gate komplett selbst — kein eigener
„darf-die-Person"-Check nötig.

```
https://discord.com/oauth2/authorize
  ?client_id=<APP_ID>                 # eine App für alle Kunden (Plattform)
  &scope=bot+applications.commands
  &permissions=<bitmask>
  &state=<signierte orgId>            # bindet Invite an die richtige Org
```

- Discord zeigt nur Server, auf denen der User **„Server verwalten"** hat → das
  ist das eingebaute Gate. Wir prüfen nichts.
- Callback liefert `guild_id` zurück → `organizations.discord_guild_id` setzen.
- Wer den Invite abschließt → `Membership(OWNER)` der Org.

**Bot-Permissions** (Bitmask via Dev-Portal „URL Generator" erzeugen):
View Channels · Send Messages · Embed Links · Read Message History ·
Add Reactions · Mention Roles. (`Use Slash Commands` kommt über den
`applications.commands`-Scope, nicht als Permission-Bit.)

### Admin-Bestimmung über Discord (statt Passwort)
- Kein `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH` mehr pro Team.
- Admin = Org-OWNER **oder** Discord-Rolle/„Server verwalten" im verknüpften
  Server. Prüfung **serverseitig via Bot** (Bot sieht Guild-Rollen ohne
  Extra-OAuth-Scope) → Login-OAuth bleibt minimal (`identify`).
- `mapping.isAdmin`-Flag kann bleiben, wird aber aus Discord abgeleitet/gesynct.

### Env-Vars: Plattform vs. (entfällt für Kunden)
| Heute | SaaS |
|---|---|
| `JWT_SECRET` | Plattform — einmal gesetzt, Kunde sieht es nie |
| `DISCORD_TOKEN` | Plattform — ein Bot |
| `DISCORD_CLIENT_ID/SECRET` | Plattform — eine App |
| `DISCORD_REDIRECT_URI` | Plattform |
| `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` | **entfällt** — Admin via Discord |
| `DISCORD_GUILD_ID` | **entfällt** — kommt aus dem Invite |

→ Endnutzer-Setup: *Sign up → „Add to Discord" → Channel & Post-Zeit.*
Keine Secrets, keine Tokens.

### Dashboard-Änderungen (Friction raus)
- **`login-form.tsx`:** `/admin/login` (User/Passwort) entfernen; Discord-OAuth
  wird Haupt-Login (heute hinter `allowDiscordAuth`-Toggle). Player-Picker bleibt
  optional als read-only; Admin-Aktionen erfordern Discord-Login.
- **`auth.controller.ts`:** Callback nutzt `X-Tenant`/Subdomain → Org →
  Membership → Bot prüft Guild-Rolle → Admin? `allowDiscordAuth`-Check entfällt.
- **`admin-settings.tsx`:** `allowDiscordAuth`-Toggle, Guild-ID-Auswahl und
  Admin-Credential-UI raus. Channel-/Rollen-Picker bleiben, lesen aus der
  verknüpften Guild der Org (`discord.routes.ts` nutzt `org.discordGuildId`
  statt `config.discord.guildId`).

---

## 8. Subdomain-Routing & Auth

### 8.1 DNS / TLS
- Wildcard `*.synqed.org` → Railway, am besten Cloudflare davor
  (Universal SSL deckt `*.synqed.org` eine Ebene tief, gratis Wildcard-TLS).
- Railway: ein Custom-Domain-Eintrag, kein Setup pro Kunde.

### 8.2 SPA (ein Build für alle)
- `BOT_API_URL`-Logik bleibt, aber der **Tenant** kommt aus
  `window.location.hostname` → erstes Label = slug.
- Jeder API-Call sendet `X-Tenant: <slug>` (zentral in `lib/api.ts`).
- `synqed.org` (kein/Apex-Subdomain) → Control-Plane-Modus des SPA.
- `app.synqed.org` o.ä. reservieren (nicht als Team-slug zulassen).

### 8.3 Auth (Ein Account → mehrere Teams)
- **Account-Login** auf `synqed.org`: Discord OAuth → Account + Session.
- **JWT** enthält `accountId` + aktive `organizationId` (+ Rolle aus Membership).
- Tenant-Resolver-Middleware:
  1. slug aus `X-Tenant` → Org laden.
  2. JWT prüfen → Membership(accountId, org) muss existieren, sonst 403.
  3. `req.org`, `req.account`, `req.db = prismaForOrg(org.id)` setzen.
- **Cross-Subdomain:** Cookie auf `.synqed.org` (alle Subdomains) ODER zentrale
  Login-Seite, die nach Org-Wahl auf die Team-Subdomain mit Token weiterleitet.
- **Org-Switcher** im UI: listet Memberships des Accounts, Wechsel = Navigation
  zur anderen Subdomain.
- Migration des heutigen Logins (Admin user/pass, Player-Picker): bleibt als
  team-interner Login erhalten, aber unter dem Org-Account-Dach.

---

## 9. Control Plane (`synqed.org`)

Gleiches SPA, Hostname-geschaltet. Enthält:
- Marketing-/Landingpage.
- Sign-up / Login (Account-Ebene).
- "Create team" (slug, name) → Org anlegen.
- Bot-Invite-Button (§7).
- Org-Liste / Switcher.
- (später) Billing, Pläne, Limits.

Backend: neue Route-Gruppe `/api/platform/*` (account-scoped, **nicht**
org-scoped) für Account-, Org- und Membership-Verwaltung.

---

## 10. Phasen-Reihenfolge

> Jede Phase ist für sich deploybar/testbar. Commit am Ende jeder Phase.

| # | Phase | Inhalt | Risiko |
|---|---|---|---|
| **1** | **Datenmodell + Scoping-Fundament** | `organizations`/`accounts`/`memberships`, `org_id` überall, Unique-Constraints umbauen, Backfill-Migration, Prisma-Guard-Extension | 🔴 hoch (Leakage) |
| **2** | **Repositories org-scoped** | alle 9 Repos auf scoped client umstellen, `findUnique(discordId)` → `findFirst(org+discordId)` | 🔴 hoch |
| **3** | **Config/Settings pro Org** | `config`-Singleton → `getOrgConfig(orgId)` + Cache, settings pro Org, `DISCORD_GUILD_ID`-Env raus | 🟠 mittel |
| **4** | **Bot multi-guild** | `interactionCreate` guildId→Org, Commands global, guildCreate/Delete | 🟠 mittel |
| **5** | **Scheduler multi-tenant** | Minuten-Tick über alle Orgs (Option A) | 🟠 mittel |
| **6** | **Subdomain-Routing + Tenant-Auth** | Wildcard-DNS, X-Tenant, Resolver-Middleware, Account-JWT, Org-Switcher | 🟠 mittel |
| **7** | **Control Plane + Onboarding** | Apex-Seite, Sign-up, Org-Erstellung, Bot-Invite-Callback, Setup-Wizard | 🟠 mittel |
| **8** | **Billing** (später) | Stripe, Pläne, Limits, Self-Service-Checkout | — |

**Empfehlung:** Vor Phase 1 ggf. ein **Proof of Concept** (1 Feature end-to-end
multi-tenant, z.B. Schedule) um den Guard + Tenant-Resolver zu validieren —
billiger Fehler-Frühwarner, bevor 9 Repos umgebaut werden.

---

## 10b. PoC — finalisiertes Design (Branch `poc/multi-tenancy`)

**Entscheidungen:** ALS + fail-closed Prisma-Guard · end-to-end inkl. Dashboard ·
Tenant-Modelle im PoC: nur `Schedule` + `SchedulePlayer`.

**Scoping-Mechanik:**
- `orgContext` = `AsyncLocalStorage<string>` (orgId). Helper `runWithOrg(orgId, fn)`.
- Prisma `$extends`-Guard auf dem globalen Client. Für Tenant-Modelle:
  - kein Context → **throw** (fail-closed, kein Leak).
  - `findMany/findFirst/count/aggregate/groupBy/updateMany/deleteMany` →
    `where.organizationId` injizieren.
  - `create/createMany` → `data.organizationId` injizieren.
  - `findUnique/upsert` werden auf Tenant-Modellen **nicht** unterstützt
    (zusammengesetzte Unique `[organizationId, date]`); im Code zu
    `findFirst` bzw. find-then-write umgebaut. Guard wirft sonst klare Meldung.
- Alle direkten Tenant-Queries leben in nur 2 Dateien: `schedule.repository.ts`
  + `database-initializer.ts`. Rest geht über Repo-Funktionen.

**Context-Quellen (sonst greift fail-closed):**
- API: Tenant-Middleware liest `X-Tenant`-Header → Org → `runWithOrg` um den Request.
  ALS propagiert in alle aufgerufenen async-Funktionen (auch Bot-Helper im Request).
- Startup (`index.ts`), Scheduler-Cron-Callbacks, Bot-Events (`client.ts`):
  in **Default-Org-Context** gewrappt (PoC bedient nur die Default-Org per Bot/Cron;
  später: per-Org-Loop bzw. guildId→Org).

**Daten:** Migration-Script legt `organizations` an, backfillt Bestandsdaten in
Org `default`, seedet zweite Org `g2` mit eigenen Schedules/Playern.

**Dashboard:** `lib/api.ts` sendet `X-Tenant`. Slug-Quelle: `?tenant=`/localStorage-
Override → sonst Subdomain → sonst `default`. Dev-Tenant-Switcher zum Umschalten
zwischen `default` und `g2` (lokal ohne echte Subdomains).

---

## 10c. Mehrere Teams auf EINER Guild (Main + Academy)

Das kippt die Annahme „1 Guild = 1 Org". Ein Verein (z.B. WGW) hat **eine**
Discord-Guild, aber **mehrere Teams** (Main, Academy) mit getrennten Rostern,
Channels, Schedules — und eigenen Subdomains.

**Lösung: zwei Ebenen.**
```
Account / Verein  (besitzt die Guild, Billing)   1 ──── N   Team (= Tenant)
   discordGuildId  (unique)                                   slug/subdomain
                                                              discordChannelId
                                                              roster, schedules
```
- **Organization (= Team) bleibt der Tenant** für alle Schedule-Daten — exakt wie
  im PoC. Main und Academy sind einfach **zwei Orgs** unter demselben Account.
- `discordGuildId` wandert auf den **Account** und ist dort unique. Auf der
  Org/Team-Ebene ist die Guild **nicht** unique (mehrere Teams teilen sie).

**Tenant-Auflösung pro Kanal (statt pro Guild):**
- **Dashboard/API:** unverändert — jedes Team hat seine eigene Subdomain
  (`wgw-main.synqed.org`, `wgw-academy.synqed.org`). Die Guild ist hier irrelevant.
- **Bot:** löst Interactions über den **Channel** auf, nicht die Guild.
  `interaction.channelId` ist immer gesetzt. Mapping `channelId → Team`.
  - Team-Channels (#main-schedule, #academy-schedule) → eindeutiges Team.
  - Command außerhalb eines Team-Channels: Fallback über die **Team-
    Mitgliedschaft** des Users; ist er in mehreren (z.B. Coach) → Auswahl/Default.

**Onboarding:** Bot **einmal** pro Guild einladen (Account). Dann pro Team:
Subdomain + Channel wählen → fertig. Academy = „weiteres Team hinzufügen".

**Auswirkung auf den PoC:** Die Dashboard-Seite kann das **schon heute**
(subdomain-basiert, Guild egal) — `g2` und ein hypothetisches `g2-academy` wären
einfach zwei Orgs. Nur der **Bot** braucht später Channel-statt-Guild-Auflösung;
dafür: `discordGuildId @unique` von der Org runter auf einen Account heben und ein
`channelId → org`-Mapping einführen (eigene Phase, nicht im PoC).

---

## 11. Offene Detail-Entscheidungen (für später)

- **Datei-Storage** (`strategy_images/files`): heute vermutlich lokales FS auf
  Railway. Multi-Tenant → org-Präfix im Pfad/Key; bei Skalierung S3/R2 erwägen.
- **Discord-Rate-Limits:** ein Bot-Token teilt globale Discord-Rate-Limits über
  alle Guilds. Bei vielen Teams beobachten (discord.js queued automatisch).
- **Slash-Command-Registrierung:** global statt per-guild → Propagation bis zu
  1h. Für Onboarding-UX bedenken (ggf. initial per-guild registrieren).
- **slug-Reservierungen:** `app`, `www`, `api`, `admin`, `mail` etc. blocken.
- **Org-Löschung / Bot-Kick:** Datenaufbewahrung & Cascade-Verhalten festlegen.
- **DSGVO:** Spielerdaten pro Org, Export/Löschung pro Org.
