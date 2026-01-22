# Dateien die nach PostgreSQL-Migration gelöscht werden können

## ❌ Alte Google Sheets Module (NICHT MEHR VERWENDET)

Diese Dateien werden **NICHT MEHR VERWENDET** und können sicher gelöscht werden:

### Hauptmodule (komplett ersetzt durch database/*)
- ✅ **`src/sheets.ts`** (780 Zeilen) - Ersetzt durch `src/database/schedules.ts`
- ✅ **`src/userMapping.ts`** (180 Zeilen) - Ersetzt durch `src/database/userMappings.ts`
- ✅ **`src/absences.ts`** (350 Zeilen) - Ersetzt durch `src/database/absences.ts`
- ✅ **`src/scrims.ts`** (331 Zeilen) - Ersetzt durch `src/database/scrims.ts`

### Hilfsmodule (Google Sheets spezifisch)
- ✅ **`src/sheetUpdater.ts`** - Google Sheets Update-Operationen

## ⚠️ Module die NOCH VERWENDET werden

Diese Module nutzen noch Google Sheets Code und müssen angepasst werden:

### Benötigt Anpassung:
1. **`src/scheduleCache.ts`**
   - Zeile 2: `import { getAuthenticatedClient } from './sheetUpdater.js';`
   - ❌ Nutzt noch `getAuthenticatedClient` für direkte Sheet-Zugriffe
   - ✅ Muss auf PostgreSQL umgestellt werden

2. **`src/interactive.ts`**
   - Zeile 17: `import { updatePlayerAvailability, getPlayerAvailabilityForRange, getAvailableDates } from './sheetUpdater.js';`
   - ❌ Nutzt noch `sheetUpdater` für Availability-Updates
   - ✅ Muss auf PostgreSQL umgestellt werden

3. **`src/changeNotifier.ts`**
   - Zeile 3: `import { getAuthenticatedClient } from './sheetUpdater.js';`
   - ❌ Nutzt noch `getAuthenticatedClient`
   - ✅ Muss auf PostgreSQL umgestellt werden

4. **`src/bulkOperations.ts`**
   - Zeile 1: `import { updatePlayerAvailability } from './sheetUpdater.js';`
   - ❌ Nutzt noch `sheetUpdater`
   - ✅ Muss auf PostgreSQL umgestellt werden

## 📦 Dependencies die entfernt werden können

Nach dem Löschen der Dateien und Anpassen der Module:

```bash
npm uninstall googleapis
```

## 🗑️ Weitere Dateien

- ✅ **`credentials.json`** - Google Sheets API Credentials (nicht mehr benötigt)

## 🔧 Empfohlene Vorgehensweise

### Option 1: Sofort löschen (Risiko: Mittleres)
```bash
# Alte Module löschen
rm src/sheets.ts
rm src/userMapping.ts
rm src/absences.ts
rm src/scrims.ts

# Dann die abhängigen Module anpassen
```

### Option 2: Schrittweise (Empfohlen)
1. ✅ Zuerst abhängige Module anpassen:
   - `scheduleCache.ts` auf PostgreSQL umstellen
   - `interactive.ts` auf PostgreSQL umstellen
   - `changeNotifier.ts` auf PostgreSQL umstellen
   - `bulkOperations.ts` auf PostgreSQL umstellen

2. ✅ Dann alte Module löschen:
   - `sheets.ts`, `userMapping.ts`, `absences.ts`, `scrims.ts`, `sheetUpdater.ts`

3. ✅ Dependencies aufräumen:
   - `npm uninstall googleapis`
   - `credentials.json` löschen

## 📊 Zusammenfassung

**Können sofort gelöscht werden**: 0 Dateien (erst nach Anpassung der abhängigen Module)
**Müssen angepasst werden**: 4 Dateien (`scheduleCache.ts`, `interactive.ts`, `changeNotifier.ts`, `bulkOperations.ts`)
**Können dann gelöscht werden**: 5 Dateien + 1 Package + 1 credentials.json

**Geschätzte Einsparung**: ~2000 Zeilen Code + googleapis Package (~5 MB)
