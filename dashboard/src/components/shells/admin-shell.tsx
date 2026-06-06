import { useMemo, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
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
  ArrowLeftIcon,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import type { NavGroupConfig } from '@/components/app-sidebar'
import type { NavUserInfo } from '@/components/nav-user'
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'

  const authUser = getUser()
  const userName = authUser?.username ?? null
  // Owner/Admin-only areas (settings, security, logs). A MANAGER gets the
  // operative tabs (incl. Users/roster) but not these — mirrors requireOrgAdmin.
  const isOrgAdmin = authUser?.orgRole === 'OWNER' || authUser?.orgRole === 'ADMIN'
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
          ...(isOrgAdmin
            ? [{ title: 'Settings', url: '/admin?tab=settings', icon: <Settings />, isActive: tab === 'settings' }]
            : []),
          { title: 'Actions', url: '/admin?tab=actions', icon: <Zap />, isActive: tab === 'actions' },
          ...(isOrgAdmin
            ? [
                { title: 'Security', url: '/admin?tab=security', icon: <Shield />, isActive: tab === 'security' },
                { title: 'Logs', url: '/admin?tab=logs', icon: <Terminal />, isActive: tab === 'logs' },
              ]
            : []),
        ],
      },
    ],
    [tab, isOrgAdmin],
  )

  const user: NavUserInfo | undefined = userName
    ? { name: userName, avatar: avatarUrl ?? undefined, role: userRole || 'Admin' }
    : undefined

  return (
    <AppShell
      brand={{
        subtitle: 'Admin Panel',
        homeUrl: '/admin?tab=dashboard',
      }}
      navGroups={navGroups}
      footerExtra={
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Back to Schedule" onClick={() => navigate('/')}>
              <ArrowLeftIcon />
              <span>Back to Schedule</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      }
      user={user}
      onLogout={() => void logout()}
      pageTitle={TITLES[tab]}
    >
      {children}
    </AppShell>
  )
}
