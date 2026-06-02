# Matches & Statistics

## Matches (Scrim Management)

The matches component (`components/shared/matches.tsx`) is used in both the user portal and the admin panel.

### Features

**Scrim list:**
- All scrims in chronological order
- Filter by map, result, and time range
- Compact cards with the key details

**Scrim details:**
- Date, opponent, result, score
- Map and match type
- Agents on both teams
- VOD link and match link
- Notes

**CRUD (admin only):**
- Create a scrim with full details
- Edit any field
- Delete (cascades to VOD comments)

### Agent Picker

A dedicated component (`agent-picker.tsx`) handles multi-selection of Valorant agents:

**Available agents:** Astra, Breach, Brimstone, Chamber, Clove, Cypher, Deadlock, Fade, Gekko, Harbor, Iso, Jett, KAY/O, Killjoy, Neon, Omen, Phoenix, Raze, Reyna, Sage, Skye, Sova, Tejo, Viper, Vyse, Waylay, Yoru

**Available maps:** Abyss, Ascent, Bind, Breeze, Corrode, Fracture, Haven, Icebox, Lotus, Pearl, Split, Sunset

**Match types:** Scrim, Tournament, Premier, Custom

## Statistics

The statistics component (`components/shared/statistics.tsx`) shows aggregated data using Recharts.

### Visualizations

**Overall summary:**
- Win/loss/draw distribution
- Overall win rate as a percentage

**Map statistics:**
- Win rate per map
- Number of games per map
- Bar chart

**Agent statistics:**
- Most-played agents
- Win rate per agent

**Time series:**
- Win rate over time
- Match frequency
- Trend lines

### Data Source

All statistics are derived from the stored scrim data:

```
GET /api/scrims                → Raw data
GET /api/scrims/stats/summary  → Pre-computed summary
```

## VOD Integration

Scrims with a `vodUrl` include a direct link to the [VOD Review](/dashboard/vod-review) system.
