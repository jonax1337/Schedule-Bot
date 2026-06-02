import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Schedule-Bot',
  description: 'Discord bot & web dashboard for E-sports team scheduling',
  lang: 'en-US',
  base: '/Schedule-Bot/',

  // localhost URLs in dev/setup docs are illustrative, not real links
  ignoreDeadLinks: 'localhostLinks',

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/Schedule-Bot/logo.png' }],
  ],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/overview' },
      { text: 'Dashboard', link: '/dashboard/overview' },
      { text: 'Bot', link: '/bot/overview' },
      { text: 'Database', link: '/database/schema' },
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
          text: 'Introduction',
          items: [
            { text: 'Overview', link: '/guide/overview' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Configuration', link: '/guide/configuration' },
          ]
        },
        {
          text: 'Concepts',
          items: [
            { text: 'Scheduling System', link: '/guide/scheduling' },
            { text: 'Availability', link: '/guide/availability' },
            { text: 'Timezones', link: '/guide/timezones' },
            { text: 'Authentication', link: '/guide/authentication' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/overview' },
            { text: 'Authentication', link: '/api/auth' },
            { text: 'Schedule', link: '/api/schedule' },
            { text: 'User Mappings', link: '/api/user-mappings' },
            { text: 'Scrims', link: '/api/scrims' },
            { text: 'Absences', link: '/api/absences' },
            { text: 'Recurring Availability', link: '/api/recurring' },
            { text: 'Strategies', link: '/api/strategies' },
            { text: 'VOD Comments', link: '/api/vod-comments' },
            { text: 'Actions', link: '/api/actions' },
            { text: 'Settings', link: '/api/settings' },
          ]
        }
      ],
      '/dashboard/': [
        {
          text: 'Dashboard',
          items: [
            { text: 'Overview', link: '/dashboard/overview' },
            { text: 'User Portal', link: '/dashboard/user-portal' },
            { text: 'Admin Panel', link: '/dashboard/admin-panel' },
            { text: 'Matches & Statistics', link: '/dashboard/matches' },
            { text: 'Stratbook', link: '/dashboard/stratbook' },
            { text: 'VOD Review', link: '/dashboard/vod-review' },
            { text: 'Components', link: '/dashboard/components' },
          ]
        }
      ],
      '/bot/': [
        {
          text: 'Discord Bot',
          items: [
            { text: 'Overview', link: '/bot/overview' },
            { text: 'Slash Commands', link: '/bot/commands' },
            { text: 'Interactions', link: '/bot/interactions' },
            { text: 'Embeds & Messages', link: '/bot/embeds' },
            { text: 'Scheduler & Cron Jobs', link: '/bot/scheduler' },
            { text: 'Polls', link: '/bot/polls' },
          ]
        }
      ],
      '/database/': [
        {
          text: 'Database',
          items: [
            { text: 'Schema', link: '/database/schema' },
            { text: 'Repositories', link: '/database/repositories' },
            { text: 'Migrations', link: '/database/migrations' },
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
            { text: 'Environment Variables', link: '/deployment/environment' },
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
      label: 'On this page'
    },

    editLink: {
      pattern: 'https://github.com/jonax1337/Schedule-Bot/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    lastUpdated: {
      text: 'Last updated'
    },

    docFooter: {
      prev: 'Previous',
      next: 'Next'
    },

    returnToTopLabel: 'Back to top',
    sidebarMenuLabel: 'Menu',
    darkModeSwitchLabel: 'Appearance',
  }
})
