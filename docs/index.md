---
layout: home

hero:
  name: Schedule-Bot
  text: E-Sports Team Management
  tagline: Discord bot & web dashboard for serious Valorant team scheduling.
  image:
    src: /logo.png
    alt: Schedule-Bot Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/overview
    - theme: alt
      text: GitHub
      link: https://github.com/jonax1337/Schedule-Bot

features:
  - icon: 🤖
    title: Discord Bot
    details: Slash commands, interactive buttons, polls and automatic schedule posts — all driven from inside your team's Discord.
  - icon: 🖥️
    title: Web Dashboard
    details: Admin panel + user portal built on Next.js. Scheduling, matches, the stratbook and statistics in one place.
  - icon: 📅
    title: Smart Scheduling
    details: 14-day outlook, weekly recurring availability, absence tracking and automated reminders that respect each player's plan.
  - icon: 🎮
    title: Scrim Tracking
    details: Capture results with maps, agents and VOD links — then read the meta off rich, filterable statistics.
  - icon: 📋
    title: Stratbook
    details: Rich-text editor for team strategies with map/agent tags, folders, image and PDF upload, and configurable permissions.
  - icon: 🌍
    title: Timezone-Aware
    details: Per-player IANA timezones, automatic conversion on input, Discord timestamps on output — every viewer sees their local time.
---

## At a glance

Schedule-Bot is an all-in-one management tool for E-sports teams. It bundles a Discord
bot, a REST API, and a Next.js dashboard into a single Node.js process.

### Three components

| Component | Stack | Port | Role |
| --- | --- | --- | --- |
| **Discord Bot** | discord.js v14 | — | Slash commands, buttons, polls |
| **API Server** | Express v5 | `:3001` | REST API with JWT auth |
| **Dashboard** | Next.js v16 | `:3000` | Admin panel & user portal |

### Tech stack

- **Backend** — TypeScript, Node.js, Express, discord.js
- **Frontend** — Next.js 16, React 19, Tailwind CSS 4, Radix UI
- **Database** — PostgreSQL with Prisma 7
- **Scheduling** — node-cron with timezone-aware crons
- **Auth** — JWT + bcrypt + Discord OAuth
