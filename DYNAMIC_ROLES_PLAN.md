# 🎯 Dynamische Subs/Coaches + Custom Namen - Implementierungsplan

## Anforderungen:

1. **Unbegrenzte Subs und Coaches:** Beliebig viele Subs/Coaches im Admin Dashboard hinzufügen können
2. **Custom Namen:** Statt "Player1", "Sub1", "Coach" sollen echte Namen in Discord Messages erscheinen
3. **Dynamisches System:** Keine hardcoded Columns mehr (player1-5, sub1-2, coach)

---

## 🔍 Aktuelles System (Probleme):

### Prisma Schema - Hardcoded Columns:
```prisma
model Schedule {
  player1   String   @default("")
  player2   String   @default("")
  player3   String   @default("")
  player4   String   @default("")
  player5   String   @default("")
  sub1      String   @default("")
  sub2      String   @default("")
  coach     String   @default("")
}
```
**Problem:** Nur 5 Main Players, 2 Subs, 1 Coach möglich

### UserMapping - Hardcoded Namen:
```prisma
model UserMapping {
  sheetColumnName String   // "Player 1", "Sub 1", "Coach"
  role            UserRole // MAIN, SUB, COACH
}
```
**Problem:** Namen sind hardcoded ("Player 1", "Sub 1", etc.)

### Discord Embed - Hardcoded Logik:
```typescript
// embed.ts
const visibleSubs = schedule.subs.filter(p =>
  p.timeRange !== null || (p.name !== 'Sub1' && p.name !== 'Sub2')
);
```
**Problem:** Prüft auf hardcoded "Sub1", "Sub2"

---

## ✅ Lösungskonzept:

### 1. **Neues Prisma Schema - Dynamische Columns**

**Statt hardcoded columns:**
```prisma
model Schedule {
  id        Int      @id @default(autoincrement())
  date      String   @unique
  reason    String   @default("")
  focus     String   @default("")
  
  // Relation zu dynamischen Player Entries
  players   SchedulePlayer[]
}

model SchedulePlayer {
  id          Int      @id @default(autoincrement())
  scheduleId  Int
  schedule    Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  
  userId      String   // Discord ID
  username    String   // Display Name (z.B. "Max", "Jonas")
  role        UserRole // MAIN, SUB, COACH
  availability String  @default("") // "14:00-20:00", "x", ""
  
  @@index([scheduleId])
  @@index([userId])
}
```

**Vorteile:**
- ✅ Unbegrenzte Subs/Coaches
- ✅ Echte Namen statt "Player1"
- ✅ Keine hardcoded Columns

### 2. **UserMapping erweitern**

```prisma
model UserMapping {
  id              Int      @id @default(autoincrement())
  discordId       String   @unique
  discordUsername String   // Discord Username
  displayName     String   // Custom Name für Discord Messages (z.B. "Max", "Jonas")
  role            UserRole
  sortOrder       Int      @default(0) // Für Reihenfolge in Discord Messages
}
```

**Vorteile:**
- ✅ `displayName` für Custom Namen
- ✅ `sortOrder` für Reihenfolge (Main Players zuerst, dann Subs, dann Coaches)

### 3. **Discord Embed - Dynamisch**

```typescript
// embed.ts
export function buildScheduleEmbed(result: ScheduleResult): EmbedBuilder {
  const embed = new EmbedBuilder();
  
  // Main Players (role === MAIN)
  const mainPlayers = result.players.filter(p => p.role === 'MAIN');
  if (mainPlayers.length > 0) {
    const mainLines = mainPlayers.map(p => formatPlayer(p)).join('\n');
    embed.addFields({ name: 'Main Roster', value: mainLines });
  }
  
  // Subs (role === SUB)
  const subs = result.players.filter(p => p.role === 'SUB');
  if (subs.length > 0) {
    const subLines = subs.map(p => formatPlayer(p)).join('\n');
    embed.addFields({ name: 'Subs', value: subLines });
  }
  
  // Coaches (role === COACH)
  const coaches = result.players.filter(p => p.role === 'COACH');
  if (coaches.length > 0) {
    const coachLines = coaches.map(p => formatPlayer(p)).join('\n');
    embed.addFields({ name: 'Coaches', value: coachLines });
  }
}

function formatPlayer(player: PlayerInfo): string {
  // Nutzt player.displayName statt hardcoded "Player1"
  if (player.available && player.timeRange) {
    return `✅ ${player.displayName} \`${player.timeRange.start} - ${player.timeRange.end}\``;
  }
  return `❌ ~~${player.displayName}~~`;
}
```

---

## 🚀 Implementierungsschritte:

### Phase 1: Datenbank Migration
1. ✅ Neues Prisma Schema erstellen
2. ✅ Migration erstellen (`prisma migrate dev`)
3. ✅ Alte Daten migrieren (Script)

### Phase 2: Backend Anpassungen
1. ✅ `database/schedules.ts` - Dynamische Player Queries
2. ✅ `database/userMappings.ts` - displayName Support
3. ✅ `scheduleCache.ts` - Dynamische Player Loading
4. ✅ `analyzer.ts` - Dynamische Roster Analysis
5. ✅ `embed.ts` - Dynamische Discord Messages

### Phase 3: API Anpassungen
1. ✅ `apiServer.ts` - Endpoints für dynamische Players
2. ✅ User Mappings API - displayName Support

### Phase 4: Frontend Anpassungen
1. ✅ Admin Dashboard - User Mappings mit displayName
2. ✅ Schedule Editor - Dynamische Columns
3. ✅ User Page - Dynamische Availability

---

## 📋 Wichtige Überlegungen:

### Migration von alten Daten:
```typescript
// Migration Script
async function migrateOldScheduleData() {
  const oldSchedules = await prisma.schedule.findMany();
  const userMappings = await prisma.userMapping.findMany();
  
  for (const schedule of oldSchedules) {
    // Für jeden Player (player1-5, sub1-2, coach)
    const players = [
      { field: 'player1', role: 'MAIN' },
      { field: 'player2', role: 'MAIN' },
      // ... etc
    ];
    
    for (const player of players) {
      const mapping = userMappings.find(m => m.sheetColumnName === player.field);
      if (mapping) {
        await prisma.schedulePlayer.create({
          data: {
            scheduleId: schedule.id,
            userId: mapping.discordId,
            username: mapping.displayName,
            role: player.role,
            availability: schedule[player.field],
          }
        });
      }
    }
  }
}
```

### Backwards Compatibility:
- ❌ Nicht nötig - Breaking Change ist OK
- ✅ Alte Schedule Tabelle kann gelöscht werden nach Migration

### Performance:
- ✅ Indexes auf `scheduleId` und `userId`
- ✅ Eager Loading mit Prisma `include`
- ✅ Cache bleibt bestehen

---

## 🎯 Ergebnis:

**Vorher:**
```
Main Roster:
✅ Player1 14:00-20:00
✅ Player2 14:00-20:00
❌ Player3

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
❌ Tim

Subs:
✅ Leon 16:00-20:00
✅ Felix 17:00-20:00
✅ Sarah 18:00-20:00

Coaches:
✅ Michael 14:00-18:00
✅ Anna 15:00-19:00
```

---

## ⚠️ Breaking Changes:

1. **Datenbank Schema:** Komplett neues Schema
2. **API Responses:** Neue Struktur für Schedule Daten
3. **Frontend:** Muss angepasst werden für dynamische Columns

**Migration erforderlich!**

---

## 🔧 Alternative: Minimal-Invasive Lösung

**Falls Breaking Changes zu groß:**

### Nur displayName hinzufügen:
```prisma
model UserMapping {
  // ... existing fields
  displayName String @default("") // Neu
}
```

**Dann:**
- UserMappings bekommen displayName Field
- Discord Embeds nutzen displayName statt hardcoded Namen
- Schedule Tabelle bleibt gleich (player1-5, sub1-2, coach)
- **Aber:** Immer noch limitiert auf 5+2+1

**Vorteil:** Weniger Aufwand  
**Nachteil:** Keine unbegrenzten Subs/Coaches

---

## 💡 Empfehlung:

**Vollständige Migration** (Phase 1-4) für langfristige Flexibilität!

**Zeitaufwand:** ~4-6 Stunden  
**Komplexität:** Mittel-Hoch  
**Nutzen:** Hoch - Unbegrenzte Subs/Coaches + Custom Namen
