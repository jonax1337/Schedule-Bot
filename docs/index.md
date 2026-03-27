---
layout: home

hero:
  name: Schedule-Bot
  text: E-Sports Team Management
  tagline: Discord Bot & Web Dashboard fuer professionelles Valorant Team-Scheduling
  image:
    src: /logo.png
    alt: Schedule-Bot Logo
  actions:
    - theme: brand
      text: Erste Schritte
      link: /guide/getting-started
    - theme: alt
      text: API-Referenz
      link: /api/overview
    - theme: alt
      text: GitHub
      link: https://github.com/jonax1337/Schedule-Bot

features:
  - icon: 🤖
    title: Discord Bot
    details: Slash Commands, interaktive Buttons, Polls und automatische Schedule-Posts direkt in eurem Discord Server.
  - icon: 🖥️
    title: Web Dashboard
    details: Admin-Panel und User-Portal mit Next.js - Scheduling, Matches, Stratbook und Statistiken auf einen Blick.
  - icon: 📅
    title: Intelligentes Scheduling
    details: 14-Tage-Vorschau, wiederkehrende Verfuegbarkeiten, Abwesenheits-Tracking und automatische Erinnerungen.
  - icon: 🎮
    title: Scrim Management
    details: Match-Tracking mit Karten, Agenten, Ergebnissen, VOD-Links und detaillierten Statistiken.
  - icon: 📋
    title: Stratbook
    details: Rich-Text Editor fuer Team-Strategien mit Karten- und Agenten-Tags, Ordnerstruktur und Bildupload.
  - icon: 🌍
    title: Zeitzonen-Support
    details: Automatische Zeitkonvertierung pro Spieler mit IANA-Zeitzonen und Discord-Timestamps.
---

## Schnelluebersicht

Schedule-Bot ist ein All-in-One Management-Tool fuer E-Sports Teams. Es kombiniert einen Discord Bot mit einem Web Dashboard und einer REST API in einem einzigen Node.js-Prozess.

### Drei Komponenten

| Komponente | Technologie | Port | Beschreibung |
|------------|-------------|------|-------------|
| **Discord Bot** | discord.js v14 | - | Slash Commands, Buttons, Polls |
| **API Server** | Express.js v5 | :3001 | REST API mit JWT Auth |
| **Dashboard** | Next.js v16 | :3000 | Admin-Panel & User-Portal |

### Tech Stack

- **Backend:** TypeScript, Node.js, Express.js, discord.js
- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Radix UI
- **Datenbank:** PostgreSQL mit Prisma 7
- **Scheduling:** node-cron
- **Auth:** JWT + bcrypt + Discord OAuth
