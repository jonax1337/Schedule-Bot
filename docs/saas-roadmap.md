# Synqed SaaS — Status & Roadmap

> Die eine Datei für „wo stehen wir und wie geht's weiter". Stand: 04.06.2026,
> Branch `poc/multi-tenancy`.
> Detailpläne: [`saas-multitenancy-plan.md`](./saas-multitenancy-plan.md) ·
> lokales Setup: [`poc-tenancy-runbook.md`](./poc-tenancy-runbook.md)

## TL;DR
Das **Fundament** für Multi-Tenancy steht und ist gegen echtes Postgres getestet:
jedes Team sieht nur seine eigenen Daten, und niemand kommt über Tricks an fremde
Teams. Was **noch fehlt**, ist das **Produkt drumherum** — wie ein Kunde sich selbst
einrichtet (Subdomain, Bot einladen, Login) und wie das Ganze live geht.

---

## 1. Was fertig ist (bewiesen, auf der Branch)

| Baustein | Was es tut | Status |
|---|---|---|
| **Daten-Isolation** | `organizationId` auf allen Tenant-Tabellen; ein Prisma-Guard (AsyncLocalStorage) scopet **jede** Query automatisch und wirft, wenn der Kontext fehlt (fail-closed) | ✅ getestet |
| **Account/Membership** | Personen-Account → N Teams; Zugriff hängt an der Membership, nicht an einem (fälschbaren) Header | ✅ getestet |
| **Org-Switcher** | zeigt nur Teams, in denen der Account Mitglied ist | ✅ getestet |
| **Gescopte Tabellen** | schedules, schedule_players, scrims, vod_comments, absences, recurring, user_mappings, strategies (+folders/images/files) | ✅ |
| **Membership-Check** | `requireOrgMembership` auf allen authentifizierten Feature-Routes (verhindert Cross-Tenant-Writes) | ✅ |
| **Lokales Dev-Setup** | lokales Postgres, Setup-/Validierungs-Scripts, 117 Unit-Tests grün | ✅ |

**Was NICHT gescopet ist (Absicht):** `settings` (global, bis Config-Singleton
umgebaut ist) · `Account`/`Membership` (Plattform-Ebene, gehören keinem Team).

---

## 2. PoC-Gerüst vs. Produktion

Damit klar ist, was „echt" und was nur Test-Gerüst ist:

| Thema | Jetzt (PoC, lokal) | In Produktion |
|---|---|---|
| Welcher Tenant? | `X-Tenant`-Header / Switcher (`POC_ALLOW_HEADER_TENANT=1`) | echte **Subdomain** (`g2.synqed.org`) |
| Login | admin/`admin123` + Player-Picker | **Discord-OAuth** als Hauptweg |
| Bot | `DISABLE_BOT=1` (aus) | läuft, **multi-guild** |
| Daten | Demo-Teams WGW + g2, lokale DB | echte Kunden, Railway-DB |
| Teams anlegen | Setup-Script | **Self-Service** auf `synqed.org` |

---

## 3. Roadmap bis „live"

Reihenfolge = empfohlene Abarbeitung. Aufwand als grobe T-Shirt-Größe.

| # | Schritt | Aufwand | Risiko | Warum / Notiz |
|---|---|---|---|---|
| 1 | **Subdomain-Routing** (Wildcard-DNS + TLS via Cloudflare; Tenant aus Host statt Header) | M | mittel | macht aus dem PoC echtes Multi-Tenant; Header-Pfad fliegt raus |
| 2 | **Discord-OAuth-Login** als Hauptweg, admin-Passwort + JWT-Gefummel raus | M | mittel | 🟡 OAuth-Callback legt jetzt Account an & weist neue Kunden nicht mehr ab; Dev-Login (`/control`) lokal testbar. **Offen:** echte CLIENT_ID/SECRET setzen, admin-Passwort als Notnagel behalten |
| 3 | **Onboarding / Control-Plane** (`synqed.org`: Sign-up, „Add to Discord", Team+Subdomain anlegen) | L | mittel | 🟡 `/control`-Seite da (Login + Team anlegen + Teams-Liste). **Offen:** „Add to Discord"-Invite-Button + guild_id-Callback |
| 4 | **Bot multi-guild** + `channelId → Org` (inkl. Main/Academy) + Scheduler als per-Org-Tick | L | mittel | Discord-Seite multi-tenant |
| 5 | **`settings` pro Org** (Config-Singleton → `getOrgConfig(orgId)` + Cache) | M | mittel | jedes Team eigene Post-Zeit/Branding/etc. |
| 6 | **optionalAuth-Reads absichern** + actions/admin-Routes mit Membership-Check | S | niedrig | Rest-Lücken aus Phase „alle Tabellen" |
| 7 | **Railway-DB migrieren + deployen** (echte Daten in Org „default" backfillen) | M | **hoch** | das Echte scharf schalten — sorgfältig + Backup |
| 8 | **Billing** (Stripe, Pläne, Limits) | L | — | erst wenn verkauft wird |

**Für ein internes Tool** (ein paar befreundete Teams, kein Verkauf) reichen
praktisch **#1, #5, #7** + manuelles Team-Anlegen — #2/#3/#8 kann man sich sparen.

### ✅ Gewählter Scope: SaaS-MVP („funktionieren, nicht vergolden")
Self-Service-SaaS, aber schlicht. **Drin:** #1–#7. **Vorerst raus / minimal:**
- **#8 Billing** komplett später (Kunden anfangs manuell freischalten).
- #2 Login: Discord-OAuth als Hauptweg, aber **admin-Passwort bleibt als
  Notnagel** (kein OAuth-Edge-Case-Polish).
- #3 Onboarding: **eine schlichte Seite** (Discord-Login → Team+Slug anlegen →
  „Add to Discord"). Kein Marketing, keine Multi-Step-Wizards.
- #6 minimal halten (nur die offensichtlichen Lücken schließen).

MVP-Reihenfolge: **#1 → #2 → #3 → #4 → #5 → #6 → #7**. Jeder Schritt einzeln
lauffähig/testbar; nach #1+#2 fühlt es sich schon „echt" an.

---

## 4. Offene Produkt-Entscheidungen (deine)

1. **Internes Tool oder verkaufbares SaaS?** Bestimmt, ob #2/#3/#8 nötig sind.
2. **Branch-Strategie:** PoC weiter sammeln, oder bald aufräumen → `main`?
   (Empfehlung: nach #1+#5 ist es „mergebar gut".)
3. **Free vs. bezahlt**, Limits pro Plan — erst relevant ab #8.

---

## 5. Lokal ausprobieren
Siehe [`poc-tenancy-runbook.md`](./poc-tenancy-runbook.md). Kurz:
`npm run dev` (API-only, lokale DB) + Dashboard → Login **admin/admin123** →
Switcher unten rechts zwischen **WGW Gold** und **G2**. Validierung ohne Browser:
`npx tsx scripts/poc-tenancy-validate.ts` und `PORT=3055 npx tsx scripts/poc-http-test.ts`.

## 6. Verweise
- Architektur-/Detailplan inkl. Account-Modell, Bot-Invite, Main/Academy: `saas-multitenancy-plan.md`
- Lokales Setup, Migration, Caveats: `poc-tenancy-runbook.md`
