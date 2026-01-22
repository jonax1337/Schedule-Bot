# 🚀 Migration zu Dynamischen Players - Schritt-für-Schritt

## ⚠️ WICHTIG: Reihenfolge beachten!

Diese Migration ist ein **Breaking Change**. Folge den Schritten genau in dieser Reihenfolge.

---

## 📋 Schritt 1: Prisma Migration ausführen

```bash
cd e:\DEV\schedule-bot

# Prisma Client neu generieren
npx prisma generate

# Migration erstellen
npx prisma migrate dev --name add_dynamic_players

# Prisma Studio öffnen (optional, zum Prüfen)
npx prisma studio
```

**Was passiert:**
- ✅ Neue Tabelle `schedule_players` wird erstellt
- ✅ `schedules` Tabelle wird angepasst (player1-5, sub1-2, coach werden entfernt)
- ✅ `user_mappings` Tabelle bekommt `display_name` und `sort_order`
- ⚠️ **Alte Daten gehen verloren** - deshalb Schritt 2!

---

## 📋 Schritt 2: Daten Migration ausführen

**WICHTIG:** Erst NACH Schritt 1!

```bash
# Migration Script ausführen
npx tsx scripts/migrate-schedule-data.ts
```

**Was passiert:**
- ✅ Alte Schedule Daten werden zu `schedule_players` migriert
- ✅ UserMappings bekommen `displayName` und `sortOrder`
- ✅ Alle Availability Daten bleiben erhalten

**Erwartete Ausgabe:**
```
🚀 Starting migration...
📖 Reading old schedule data...
Found 14 schedules to migrate
📖 Reading user mappings...
Found 8 user mappings
🔄 Updating user mappings with displayName...
✅ User mappings updated
🔄 Migrating schedule data to dynamic players...
Migrated 10/14 schedules...
✅ Migration completed successfully!
📊 Statistics:
   - Schedules migrated: 14
   - User mappings updated: 8
```

---

## 📋 Schritt 3: Backend Code anpassen

**Ich werde jetzt automatisch alle Backend Files anpassen:**

1. ✅ `src/types.ts` - Neue Interfaces
2. ✅ `src/database/schedules.ts` - Dynamische Player Queries
3. ✅ `src/database/userMappings.ts` - displayName Support
4. ✅ `src/scheduleCache.ts` - Dynamisches Loading
5. ✅ `src/analyzer.ts` - Dynamische Roster Analysis
6. ✅ `src/embed.ts` - Dynamische Discord Messages
7. ✅ `src/reminder.ts` - Dynamische Player Iteration
8. ✅ `src/apiServer.ts` - Neue API Endpoints

**Das dauert ca. 10-15 Minuten...**

---

## 📋 Schritt 4: Frontend anpassen

**Nach Backend:**

1. ✅ Dashboard User Mappings - displayName Input
2. ✅ Schedule Editor - Dynamische Columns
3. ✅ User Page - Dynamische Availability

---

## 📋 Schritt 5: Testing

```bash
# Lokal testen
npm run build
npm start

# Discord Bot testen
# /schedule Command in Discord ausführen
```

**Prüfen:**
- ✅ Discord Messages zeigen echte Namen statt "Player1"
- ✅ Admin Dashboard zeigt alle Players
- ✅ Neue Subs/Coaches können hinzugefügt werden

---

## 📋 Schritt 6: Deployment

```bash
# Git Commit
git add .
git commit -m "feat: implement dynamic players system - unlimited subs/coaches with custom names"
git push origin sql

# Railway deployed automatisch
```

---

## 🔧 Troubleshooting

### Migration Script Fehler:
```
Error: Table 'schedules_backup' does not exist
```
**Fix:** Prisma Migration hat alte Tabelle nicht als Backup gespeichert. Daten sind verloren - von Backup wiederherstellen.

### TypeScript Fehler nach Migration:
```
Property 'player1' does not exist on type 'Schedule'
```
**Fix:** Das ist normal! Ich passe alle Files an. Nach Schritt 3 sollten alle Fehler weg sein.

### Discord Bot zeigt keine Namen:
```
Main Roster:
✅ undefined 14:00-20:00
```
**Fix:** UserMappings haben keine `displayName`. Migration Script nochmal ausführen.

---

## ✅ Nach erfolgreicher Migration:

**Vorher:**
```
Main Roster:
✅ Player1 14:00-20:00
✅ Player2 14:00-20:00

Subs:
✅ Sub1 16:00-20:00

Coach:
✅ Coach 14:00-18:00
```

**Nachher:**
```
Main Roster:
✅ Max 14:00-20:00
✅ Jonas 14:00-20:00

Subs:
✅ Leon 16:00-20:00
✅ Felix 17:00-20:00
✅ Sarah 18:00-20:00

Coaches:
✅ Michael 14:00-18:00
✅ Anna 15:00-19:00
```

---

## 🎉 Fertig!

**Neue Features:**
- ✅ Unbegrenzte Subs
- ✅ Unbegrenzte Coaches
- ✅ Custom Namen in Discord
- ✅ Flexible Reihenfolge (sortOrder)
- ✅ Zukunftssicher

**Jetzt kannst du im Admin Dashboard beliebig viele Subs/Coaches hinzufügen!**
