# 🚂 Railway Service URLs zwischen Services teilen

## 🎯 Was du machen willst:

**Dashboard Service** braucht die URL vom **Backend Service**  
**Backend Service** braucht die URL vom **Dashboard Service**

---

## ✅ Lösung: Railway Service Reference Variables

Railway erstellt automatisch Environment Variables für jeden Service mit seiner **Public URL**.

### Automatische Variables pro Service:

Jeder Service bekommt automatisch:
```
RAILWAY_PUBLIC_DOMAIN=dein-service.up.railway.app
RAILWAY_PRIVATE_DOMAIN=dein-service.railway.internal
```

---

## 📋 Schritt-für-Schritt Anleitung

### 1️⃣ Backend URL im Dashboard Service setzen

**Im Dashboard Service (schedule-dashboard-sql):**

1. Railway Dashboard → **Dashboard Service**
2. Tab **"Variables"**
3. **"New Variable"** klicken
4. **"Reference"** Tab wählen (nicht "Raw Editor")
5. Ausfüllen:
   ```
   Variable Name: NEXT_PUBLIC_BOT_API_URL
   Service: schedule-bot-backend-sql (aus Dropdown wählen)
   Variable: RAILWAY_PUBLIC_DOMAIN
   ```
6. **Wichtig:** Prefix hinzufügen!
   - Klicke auf das Eingabefeld
   - Ändere zu: `https://${{schedule-bot-backend-sql.RAILWAY_PUBLIC_DOMAIN}}`

**Finale Variable:**
```
NEXT_PUBLIC_BOT_API_URL=https://${{schedule-bot-backend-sql.RAILWAY_PUBLIC_DOMAIN}}
```

---

### 2️⃣ Dashboard URL im Backend Service setzen

**Im Backend Service (schedule-bot-backend-sql):**

1. Railway Dashboard → **Backend Service**
2. Tab **"Variables"**
3. **"New Variable"** klicken
4. **"Reference"** Tab wählen
5. Ausfüllen:
   ```
   Variable Name: DASHBOARD_URL
   Service: schedule-dashboard-sql (aus Dropdown wählen)
   Variable: RAILWAY_PUBLIC_DOMAIN
   ```
6. Prefix hinzufügen:
   - Ändere zu: `https://${{schedule-dashboard-sql.RAILWAY_PUBLIC_DOMAIN}}`

**Finale Variable:**
```
DASHBOARD_URL=https://${{schedule-dashboard-sql.RAILWAY_PUBLIC_DOMAIN}}
```

---

## 🎯 Warum Reference Variables?

**Vorteile:**
- ✅ Automatisch aktualisiert wenn sich die URL ändert
- ✅ Kein manuelles Copy-Paste
- ✅ Funktioniert auch bei Domain-Änderungen
- ✅ Typsicher

**Ohne Reference (manuell):**
```
❌ DASHBOARD_URL=https://schedule-dashboard-sql.up.railway.app
```
→ Muss manuell geändert werden wenn URL sich ändert

**Mit Reference (automatisch):**
```
✅ DASHBOARD_URL=https://${{schedule-dashboard-sql.RAILWAY_PUBLIC_DOMAIN}}
```
→ Wird automatisch aktualisiert!

---

## 📸 Visual Guide

### Reference Variable erstellen:

```
1. Variables Tab öffnen
2. "New Variable" klicken
3. "Reference" Tab wählen (nicht "Raw Editor")
4. Variable Name eingeben
5. Service aus Dropdown wählen
6. Variable aus Dropdown wählen (RAILWAY_PUBLIC_DOMAIN)
7. Im Eingabefeld https:// davor setzen
8. "Add" klicken
```

### Beispiel für Dashboard → Backend:

```
┌─────────────────────────────────────────┐
│ Variable Name:                          │
│ NEXT_PUBLIC_BOT_API_URL                 │
├─────────────────────────────────────────┤
│ Service:                                │
│ ▼ schedule-bot-backend-sql              │
├─────────────────────────────────────────┤
│ Variable:                               │
│ ▼ RAILWAY_PUBLIC_DOMAIN                 │
├─────────────────────────────────────────┤
│ Value Preview:                          │
│ https://${{schedule-bot-backend-sql     │
│   .RAILWAY_PUBLIC_DOMAIN}}              │
└─────────────────────────────────────────┘
```

---

## 🔍 Andere nützliche Railway Variables

**Jeder Service hat automatisch:**

```
RAILWAY_PUBLIC_DOMAIN=service-name.up.railway.app
RAILWAY_PRIVATE_DOMAIN=service-name.railway.internal
RAILWAY_ENVIRONMENT_NAME=production
RAILWAY_PROJECT_NAME=dein-projekt
RAILWAY_SERVICE_NAME=dein-service
```

**Du kannst auch referenzieren:**
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

---

## ✅ Nach dem Setzen

**Railway macht automatisch:**
1. Variable wird gesetzt
2. Service wird neu deployed
3. Neue URL ist verfügbar

**Überprüfen:**
```bash
# Via Railway CLI
npx @railway/cli variables

# Oder im Dashboard
Variables Tab → Alle Variables sehen
```

---

## 🎯 Zusammenfassung für dein Projekt

### Dashboard Service braucht:
```
NEXT_PUBLIC_BOT_API_URL=https://${{schedule-bot-backend-sql.RAILWAY_PUBLIC_DOMAIN}}
```

### Backend Service braucht:
```
DASHBOARD_URL=https://${{schedule-dashboard-sql.RAILWAY_PUBLIC_DOMAIN}}
```

**Beide als Reference Variables setzen, nicht als Raw Values!**

---

## 🚀 Quick Steps

1. **Dashboard Service** → Variables → New Variable → Reference:
   - Name: `NEXT_PUBLIC_BOT_API_URL`
   - Service: `schedule-bot-backend-sql`
   - Variable: `RAILWAY_PUBLIC_DOMAIN`
   - Prefix: `https://`

2. **Backend Service** → Variables → New Variable → Reference:
   - Name: `DASHBOARD_URL`
   - Service: `schedule-dashboard-sql`
   - Variable: `RAILWAY_PUBLIC_DOMAIN`
   - Prefix: `https://`

3. **Warten** → Railway deployed beide Services neu

4. **Fertig!** → Services können miteinander kommunizieren

---

**Reference Variables sind der Railway-Way! 🚂**
