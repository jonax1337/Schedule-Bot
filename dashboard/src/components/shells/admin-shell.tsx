import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import {
  Settings,
  Users,
  CalendarDays,
  Trophy,
  Zap,
  Shield,
  Terminal,
  LayoutDashboard,
  BarChart3,
  BookOpen,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import type { NavGroupConfig } from '@/components/app-sidebar'
import type { NavUserInfo } from '@/components/nav-user'
import { useBranding } from '@/hooks/use-branding'
import { useSidebarUserInfo } from '@/hooks/use-sidebar'
import { getUser, logout } from '@/lib/auth'

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  statistics: 'Statistics',
  schedule: 'Schedule',
  users: 'Users',
  matches: 'Matches',
  stratbook: 'Stratbook',
  settings: 'Settings',
  actions: 'Actions',
  security: 'Security',
  logs: 'Logs',
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'

  const branding = useBranding({ tagline: 'Bot Configuration' })
  const authUser = getUser()
  const userName = authUser?.username ?? null
  const { userRole, avatarUrl } = useSidebarUserInfo(userName)

  const navGroups: NavGroupConfig[] = useMemo(
    () => [
      {
        label: 'Overview',
        items: [
          { title: 'Dashboard', url: '/admin?tab=dashboard', icon: <LayoutDashboard />, isActive: tab === 'dashboard' },
          { title: 'Statistics', url: '/admin?tab=statistics', icon: <BarChart3 />, isActive: tab === 'statistics' },
        ],
      },
      {
        label: 'Schedule',
        items: [
          { title: 'Schedule', url: '/admin?tab=schedule', icon: <CalendarDays />, isActive: tab === 'schedule' },
          { title: 'Users', url: '/admin?tab=users', icon: <Users />, isActive: tab === 'users' },
        ],
      },
      {
        label: 'Competitive',
        items: [
          { title: 'Matches', url: '/admin?tab=matches', icon: <Trophy />, isActive: tab === 'matches' },
          { title: 'Stratbook', url: '/admin?tab=stratbook', icon: <BookOpen />, isActive: tab === 'stratbook' },
        ],
      },
      {
        label: 'System',
        items: [
          { title: 'Settings', url: '/admin?tab=settings', icon: <Settings />, isActive: tab === 'settings' },
          { title: 'Actions', url: '/admin?tab=actions', icon: <Zap />, isActive: tab === 'actions' },
          { title: 'Security', url: '/admin?tab=security', icon: <Shield />, isActive: tab === 'security' },
          { title: 'Logs', url: '/admin?tab=logs', icon: <Terminal />, isActive: tab === 'logs' },
        ],
      },
    ],
    [tab],
  )

  const user: NavUserInfo | undefined = userName
    ? { name: userName, avatar: avatarUrl ?? undefined, role: userRole || 'Admin' }
    : undefined

  return (
    <AppShell
      brand={{
        name: 'Admin Panel',
        subtitle: branding.tagline,
        logoUrl: branding.logoUrl,
        fallbackIcon: <Shield className="size-4" />,
        homeUrl: '/admin?tab=dashboard',
      }}
      navGroups={navGroups}
      user={user}
      onLogout={() => void logout()}
      pageTitle={TITLES[tab]}
    >
      {children}
    </AppShell>
  )
}
