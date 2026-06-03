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
  ArrowLeft,
  LayoutDashboard,
  BarChart3,
  BookOpen,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import type { SidebarNavGroup } from '@/components/app-shared'
import type { NavUserInfo } from '@/components/nav-user'
import { useBranding } from '@/hooks/use-branding'
import { useSidebarUserInfo } from '@/hooks/use-sidebar'
import { getUser, logout } from '@/lib/auth'

interface AdminShellProps {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'

  const branding = useBranding({ tagline: 'Bot Configuration' })
  const authUser = getUser()
  const userName = authUser?.username ?? null
  const { userRole, avatarUrl } = useSidebarUserInfo(userName)

  const navGroups: SidebarNavGroup[] = useMemo(
    () => [
      {
        label: 'Overview',
        items: [
          { title: 'Dashboard', path: '/admin?tab=dashboard', icon: <LayoutDashboard />, isActive: tab === 'dashboard' },
          { title: 'Statistics', path: '/admin?tab=statistics', icon: <BarChart3 />, isActive: tab === 'statistics' },
        ],
      },
      {
        label: 'Schedule',
        items: [
          { title: 'Schedule', path: '/admin?tab=schedule', icon: <CalendarDays />, isActive: tab === 'schedule' },
          { title: 'Users', path: '/admin?tab=users', icon: <Users />, isActive: tab === 'users' },
        ],
      },
      {
        label: 'Competitive',
        items: [
          { title: 'Matches', path: '/admin?tab=matches', icon: <Trophy />, isActive: tab === 'matches' },
          { title: 'Stratbook', path: '/admin?tab=stratbook', icon: <BookOpen />, isActive: tab === 'stratbook' },
        ],
      },
      {
        label: 'System',
        items: [
          { title: 'Settings', path: '/admin?tab=settings', icon: <Settings />, isActive: tab === 'settings' },
          { title: 'Actions', path: '/admin?tab=actions', icon: <Zap />, isActive: tab === 'actions' },
          { title: 'Security', path: '/admin?tab=security', icon: <Shield />, isActive: tab === 'security' },
          { title: 'Logs', path: '/admin?tab=logs', icon: <Terminal />, isActive: tab === 'logs' },
        ],
      },
    ],
    [tab],
  )

  const activePage = navGroups.flatMap((g) => g.items).find((i) => i.isActive)

  const user: NavUserInfo | undefined = userName
    ? { name: userName, avatar: avatarUrl ?? undefined, role: userRole || undefined }
    : undefined

  return (
    <AppShell
      brandTitle="Admin Panel"
      brandSubtitle={branding.tagline}
      brandIcon={<Shield />}
      brandLogoUrl={branding.logoUrl}
      onBrandClick={() => navigate('/admin?tab=dashboard')}
      navGroups={navGroups}
      footerExtra={
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Back to Schedule"
              onClick={() => navigate('/')}
            >
              <ArrowLeft />
              <span>Back to Schedule</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      }
      user={user}
      onLogout={() => void logout()}
      page={activePage ? { title: activePage.title, icon: activePage.icon } : null}
    >
      {children}
    </AppShell>
  )
}
