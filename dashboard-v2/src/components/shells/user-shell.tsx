import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  Calendar,
  CalendarCheck,
  Trophy,
  Home,
  BarChart3,
  PlaneTakeoff,
  ShieldCheck,
  BookOpen,
  RefreshCw,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import type { SidebarNavGroup } from '@/components/app-shared'
import type { NavUserInfo } from '@/components/nav-user'
import { useBranding } from '@/hooks/use-branding'
import { useSidebarUserInfo } from '@/hooks/use-sidebar'
import { getUser, getAuthHeaders, logout } from '@/lib/auth'
import { BOT_API_URL } from '@/lib/config'

interface UserShellProps {
  children: ReactNode
}

export function UserShell({ children }: UserShellProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'schedule'

  const branding = useBranding()
  const authUser = getUser()
  const userName = authUser?.username ?? localStorage.getItem('selectedUser')
  const { userRole, avatarUrl } = useSidebarUserInfo(userName)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!userName) return
    const fetchAdminStatus = async () => {
      try {
        const response = await fetch(`${BOT_API_URL}/api/user-mappings`, {
          headers: getAuthHeaders(),
        })
        if (response.ok) {
          const data = await response.json()
          const mapping = data.mappings?.find((m: { displayName: string; isAdmin?: boolean }) => m.displayName === userName)
          if (mapping) setIsAdmin(!!mapping.isAdmin)
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      }
    }
    fetchAdminStatus()
  }, [userName])

  const navGroups: SidebarNavGroup[] = useMemo(
    () => [
      {
        label: 'Overview',
        items: [{ title: 'Schedule', path: '/?tab=schedule', icon: <Home />, isActive: tab === 'schedule' }],
      },
      {
        label: 'My Schedule',
        items: [
          { title: 'Availability', path: '/?tab=availability', icon: <CalendarCheck />, isActive: tab === 'availability' },
          { title: 'Recurring', path: '/?tab=recurring', icon: <RefreshCw />, isActive: tab === 'recurring' },
          { title: 'Absences', path: '/?tab=absences', icon: <PlaneTakeoff />, isActive: tab === 'absences' },
        ],
      },
      {
        label: 'Team',
        items: [
          { title: 'Matches', path: '/?tab=matches', icon: <Trophy />, isActive: tab === 'matches' },
          { title: 'Stratbook', path: '/?tab=stratbook', icon: <BookOpen />, isActive: tab === 'stratbook' },
          { title: 'Statistics', path: '/?tab=statistics', icon: <BarChart3 />, isActive: tab === 'statistics' },
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
      brandTitle={branding.teamName}
      brandSubtitle={branding.tagline}
      brandIcon={<Calendar />}
      brandLogoUrl={branding.logoUrl}
      onBrandClick={() => navigate('/?tab=schedule')}
      navGroups={navGroups}
      footerExtra={
        isAdmin ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Admin Dashboard"
                onClick={() => navigate('/admin')}
              >
                <ShieldCheck />
                <span>Admin Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : undefined
      }
      user={user}
      onLogout={() => void logout()}
      page={activePage ? { title: activePage.title, icon: activePage.icon } : null}
    >
      {children}
    </AppShell>
  )
}
