import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  CalendarCheck,
  Trophy,
  Home,
  BarChart3,
  PlaneTakeoff,
  BookOpen,
  RefreshCw,
  ShieldCheckIcon,
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
import { getAuthHeaders, getUser, logout } from '@/lib/auth'
import { BOT_API_URL } from '@/lib/config'

const TITLES: Record<string, string> = {
  schedule: 'Schedule',
  availability: 'Availability',
  recurring: 'Recurring',
  absences: 'Absences',
  matches: 'Matches',
  stratbook: 'Stratbook',
  statistics: 'Statistics',
}

export function UserShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'schedule'

  const authUser = getUser()
  const userName = authUser?.username ?? localStorage.getItem('selectedUser')
  const { userRole, avatarUrl } = useSidebarUserInfo(userName)
  const [isAdmin, setIsAdmin] = useState(authUser?.role === 'admin')

  useEffect(() => {
    if (authUser?.role === 'admin') return
    if (!userName) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${BOT_API_URL}/api/user-mappings`, { headers: getAuthHeaders() })
        if (!res.ok) return
        const data = await res.json()
        const mapping = (data.mappings as Array<{ displayName: string; isAdmin?: boolean }> | undefined)?.find(
          (m) => m.displayName === userName,
        )
        if (!cancelled && mapping?.isAdmin) setIsAdmin(true)
      } catch {
        /* silent */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userName, authUser?.role])

  const navGroups: NavGroupConfig[] = useMemo(
    () => [
      {
        label: 'Overview',
        items: [{ title: 'Schedule', url: '/?tab=schedule', icon: <Home />, isActive: tab === 'schedule' }],
      },
      {
        label: 'My Schedule',
        items: [
          { title: 'Availability', url: '/?tab=availability', icon: <CalendarCheck />, isActive: tab === 'availability' },
          { title: 'Recurring', url: '/?tab=recurring', icon: <RefreshCw />, isActive: tab === 'recurring' },
          { title: 'Absences', url: '/?tab=absences', icon: <PlaneTakeoff />, isActive: tab === 'absences' },
        ],
      },
      {
        label: 'Team',
        items: [
          { title: 'Matches', url: '/?tab=matches', icon: <Trophy />, isActive: tab === 'matches' },
          { title: 'Stratbook', url: '/?tab=stratbook', icon: <BookOpen />, isActive: tab === 'stratbook' },
          { title: 'Statistics', url: '/?tab=statistics', icon: <BarChart3 />, isActive: tab === 'statistics' },
        ],
      },
    ],
    [tab],
  )

  const user: NavUserInfo | undefined = userName
    ? { name: userName, avatar: avatarUrl ?? undefined, role: userRole || undefined }
    : undefined

  return (
    <AppShell
      brand={{
        subtitle: 'Team Portal',
        homeUrl: '/?tab=schedule',
      }}
      navGroups={navGroups}
      footerExtra={
        isAdmin ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Admin Dashboard" onClick={() => navigate('/admin')}>
                <ShieldCheckIcon />
                <span>Admin Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : undefined
      }
      user={user}
      onLogout={() => void logout()}
      pageTitle={TITLES[tab]}
    >
      {children}
    </AppShell>
  )
}
