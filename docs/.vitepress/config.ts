import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Schedule-Bot',
  description: 'Discord Bot & Web Dashboard for E-Sports Team Scheduling',
  lang: 'de-DE',
  base: '/Schedule-Bot/',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/Schedule-Bot/logo.svg' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/overview' },
      { text: 'Dashboard', link: '/dashboard/overview' },
      { text: 'Bot', link: '/bot/overview' },
      { text: 'Datenbank', link: '/database/schema' },
      { text: 'Deployment', link: '/deployment/docker' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/jonax1337/Schedule-Bot' },
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Einfuehrung',
          items: [
            { text: 'Uebersicht', link: '/guide/overview' },
            { text: 'Erste Schritte', link: '/guide/getting-started' },
            { text: 'Architektur', link: '/guide/architecture' },
            { text: 'Konfiguration', link: '/guide/configuration' },
          ]
        },
        {
          text: 'Konzepte',
          items: [
            { text: 'Scheduling-System', link: '/guide/scheduling' },
            { text: 'Verfuegbarkeiten', link: '/guide/availability' },
            { text: 'Zeitzonen', link: '/guide/timezones' },
            { text: 'Authentifizierung', link: '/guide/authentication' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API-Referenz',
          items: [
            { text: 'Uebersicht', link: '/api/overview' },
            { text: 'Authentifizierung', link: '/api/auth' },
            { text: 'Schedule', link: '/api/schedule' },
            { text: 'User Mappings', link: '/api/user-mappings' },
            { text: 'Scrims', link: '/api/scrims' },
            { text: 'Abwesenheiten', link: '/api/absences' },
            { text: 'Wiederkehrende Verfuegbarkeit', link: '/api/recurring' },
            { text: 'Strategien', link: '/api/strategies' },
            { text: 'VOD-Kommentare', link: '/api/vod-comments' },
            { text: 'Aktionen', link: '/api/actions' },
            { text: 'Einstellungen', link: '/api/settings' },
          ]
        }
      ],
      '/dashboard/': [
        {
          text: 'Dashboard',
          items: [
            { text: 'Uebersicht', link: '/dashboard/overview' },
            { text: 'User-Portal', link: '/dashboard/user-portal' },
            { text: 'Admin-Panel', link: '/dashboard/admin-panel' },
            { text: 'Matches & Statistiken', link: '/dashboard/matches' },
            { text: 'Stratbook', link: '/dashboard/stratbook' },
            { text: 'VOD-Review', link: '/dashboard/vod-review' },
            { text: 'Komponenten', link: '/dashboard/components' },
          ]
        }
      ],
      '/bot/': [
        {
          text: 'Discord Bot',
          items: [
            { text: 'Uebersicht', link: '/bot/overview' },
            { text: 'Slash Commands', link: '/bot/commands' },
            { text: 'Interaktionen', link: '/bot/interactions' },
            { text: 'Embeds & Nachrichten', link: '/bot/embeds' },
            { text: 'Scheduler & Cron-Jobs', link: '/bot/scheduler' },
            { text: 'Polls', link: '/bot/polls' },
          ]
        }
      ],
      '/database/': [
        {
          text: 'Datenbank',
          items: [
            { text: 'Schema', link: '/database/schema' },
            { text: 'Repositories', link: '/database/repositories' },
            { text: 'Migrationen', link: '/database/migrations' },
          ]
        }
      ],
      '/deployment/': [
        {
          text: 'Deployment',
          items: [
            { text: 'Docker', link: '/deployment/docker' },
            { text: 'Railway', link: '/deployment/railway' },
            { text: 'Render', link: '/deployment/render' },
            { text: 'Umgebungsvariablen', link: '/deployment/environment' },
          ]
        }
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jonax1337/Schedule-Bot' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'MIT License',
      copyright: 'Copyright 2024-2026 jonax1337'
    },

    outline: {
      level: [2, 3],
      label: 'Auf dieser Seite'
    },

    editLink: {
      pattern: 'https://github.com/jonax1337/Schedule-Bot/edit/main/docs/:path',
      text: 'Diese Seite auf GitHub bearbeiten'
    },

    lastUpdated: {
      text: 'Zuletzt aktualisiert'
    },

    docFooter: {
      prev: 'Vorherige Seite',
      next: 'Naechste Seite'
    },

    returnToTopLabel: 'Nach oben',
    sidebarMenuLabel: 'Menu',
    darkModeSwitchLabel: 'Erscheinungsbild',
  }
})
