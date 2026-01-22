# Phase 3 - Frontend Dashboard Anpassung

## Status: In Arbeit

### ✅ Fertig:
- user-mappings-panel.tsx - displayName und sortOrder UI hinzugefügt

### ⏳ In Arbeit:
- schedule-editor.tsx - Muss für dynamische Spalten umgeschrieben werden

### 📋 Noch zu tun:
- user/page.tsx - User availability mit neuem API Endpoint
- Alle API Calls testen
- Build testen

## Wichtige Änderungen:

**UserMapping Interface:**
```typescript
// Alt:
{ discordId, discordUsername, sheetColumnName, role }

// Neu:
{ discordId, discordUsername, displayName, role, sortOrder }
```

**Schedule API:**
```typescript
// Alt: POST /api/sheet-data/update { row, column, value }
// Neu: POST /api/schedule/update-availability { date, userId, availability }
```

## Hinweis:
schedule-editor.tsx ist komplex und zeigt eine Tabelle mit allen Spielern und Daten.
Das muss komplett auf das neue dynamische System umgestellt werden.
