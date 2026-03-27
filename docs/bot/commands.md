# Slash Commands

## Uebersicht

Es gibt **17 Slash Commands** in vier Kategorien. Admin-Commands erfordern die Discord Administrator-Berechtigung.

## Oeffentliche Commands

### `/schedule`

Zeigt die Team-Verfuegbarkeit fuer ein bestimmtes Datum.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `date` | String | Nein | Datum (DD.MM.YYYY), Default: heute |

**Ausgabe:** Embed mit Spieler-Liste, Verfuegbarkeiten und Status-Analyse.

### `/schedule-week`

Zeigt eine 7-Tage-Uebersicht der naechsten Woche.

**Ausgabe:** Kompakte Wochenansicht mit Status-Indikatoren pro Tag.

### `/my-schedule`

Zeigt die persoenliche Verfuegbarkeit der naechsten 14 Tage.

**Ausgabe:** Liste aller Tage mit eigener Verfuegbarkeit und Schedule-Gruenden.

### `/view-scrims`

Zeigt die letzten Scrim-Ergebnisse.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `limit` | Integer | Nein | Anzahl (Default: 10) |

### `/scrim-stats`

Zeigt aggregierte Scrim-Statistiken: Gesamtbilanz, Win-Rate, Map-Statistiken.

## Spieler-Commands

### `/set`

Interaktiver Verfuegbarkeits-Assistent.

**Ablauf:**
1. Bot zeigt Datumsauswahl (Select Menu, naechste 14 Tage)
2. Spieler waehlt Datum
3. Optionen: Zeitfenster eingeben (Modal) oder "Nicht verfuegbar" (Button)
4. Bei Zeitfenster: `HH:MM-HH:MM` eingeben
5. Zeitzonen-Konvertierung und Speicherung
6. Bestaetigung mit konvertierter Zeit

### `/set-timezone`

Setzt die persoenliche Zeitzone.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `timezone` | String | Ja | IANA-Zeitzone (Autocomplete) |

**Beispiele:** `Europe/Berlin`, `America/New_York`, `Asia/Tokyo`

### `/remove-timezone`

Entfernt die persoenliche Zeitzone. Die Bot-Zeitzone wird wieder verwendet.

### `/set-recurring`

Setzt wiederkehrende woechentliche Verfuegbarkeiten.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `days` | String | Ja | Kommagetrennt: `mon,wed,fri` |
| `time` | String | Ja | Zeitfenster: `18:00-22:00` oder `x` |

**Beispiel:**
```
/set-recurring days:mon,tue,wed,thu,fri time:18:00-22:00
```

### `/my-recurring`

Zeigt die eigenen wiederkehrenden Verfuegbarkeiten in einer uebersichtlichen Tabelle.

### `/clear-recurring`

Loescht wiederkehrende Verfuegbarkeiten.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `day` | String | Nein | Spezifischer Tag oder alle |

## Admin-Commands

::: warning Berechtigung
Alle Admin-Commands erfordern die Discord **Administrator**-Berechtigung.
:::

### `/post-schedule`

Postet den Schedule-Embed manuell in den konfigurierten Channel.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `date` | String | Nein | Datum (Default: heute) |

### `/register`

Registriert einen Spieler im System.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `user` | User | Ja | Discord-Benutzer |
| `role` | String | Ja | `MAIN`, `SUB` oder `COACH` |

**Seiteneffekte:**
- Erstellt User Mapping
- Synchronisiert in zukuenftige Schedules

### `/unregister`

Entfernt einen Spieler aus dem System.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `user` | User | Ja | Discord-Benutzer |

### `/remind`

Sendet Erinnerungen an Spieler ohne Verfuegbarkeits-Angabe.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `date` | String | Nein | Datum (Default: heute) |

Abwesende Spieler und Coaches werden automatisch uebersprungen.

### `/notify`

Sendet DM-Benachrichtigungen.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `type` | String | Ja | `info`, `warning`, `alert` |
| `target` | String | Ja | `all`, `mains`, `subs` oder User |
| `user` | User | Nein | Spezifischer Empfaenger |

### `/poll`

Erstellt eine Quick-Poll mit Reaktions-Abstimmung.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `question` | String | Ja | Poll-Frage |
| `options` | String | Ja | Optionen (kommagetrennt) |
| `duration` | Integer | Nein | Dauer in Minuten |

### `/training-start-poll`

Aktiviert/deaktiviert den automatischen Training-Start-Poll bei Schedule-Posts.

### `/send-training-poll`

Erstellt manuell einen Training-Start-Poll.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `date` | String | Nein | Datum (Default: heute) |

### `/add-scrim`

Erfasst ein Scrim-Ergebnis.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `date` | String | Ja | Datum (DD.MM.YYYY) |
| `opponent` | String | Ja | Gegner-Team |
| `result` | String | Ja | `win`, `loss`, `draw` |
| `score_us` | Integer | Ja | Eigene Runden |
| `score_them` | Integer | Ja | Gegner-Runden |
| `map` | String | Ja | Karten-Name |
| `our_agents` | String | Nein | Eigene Agenten |
| `their_agents` | String | Nein | Gegner-Agenten |
| `vod_url` | String | Nein | VOD-Link |
| `notes` | String | Nein | Notizen |
