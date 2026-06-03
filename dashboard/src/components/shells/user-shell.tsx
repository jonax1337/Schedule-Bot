import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import {
  Calendar,
  CalendarCheck,
  Trophy,
  Home,
  BarChart3,
  PlaneTakeoff,
  BookOpen,
  RefreshCw,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import type { NavGroupConfig } from '@/components/app-sidebar'
import type { NavUserInfo } from '@/components/nav-user'
import { useBranding } from '@/hooks/use-branding'
import { useSidebarUserInfo } from '@/hooks/use-sidebar'
import { getUser, logout } from '@/lib/auth'

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
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'schedule'

  const branding = useBranding()
  const authUser = getUser()
  const userName = authUser?.username ?? localStorage.getItem('selectedUser')
  const { userRole, avatarUrl } = useSidebarUserInfo(userName)

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
        name: branding.teamName,
        subtitle: branding.tagline,
        logoUrl: branding.logoUrl,
        fallbackIcon: <Calendar className="size-4" />,
        homeUrl: '/?tab=schedule',
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
