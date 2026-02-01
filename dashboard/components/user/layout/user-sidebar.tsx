"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
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
} from "lucide-react"

import { NavUser, SidebarNavGroup, SidebarBrandingHeader } from "@/components/shared"
import type { NavItem } from "@/components/shared"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useBranding } from "@/hooks/use-branding"

interface UserSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userName?: string
  onLogout?: () => void
}

export function UserSidebar({ userName, onLogout, ...props }: UserSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = React.useState<string | undefined>(undefined)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState("")
  const branding = useBranding()

  React.useEffect(() => {
    const fetchUserRole = async () => {
      if (!userName) return

      try {
        const { BOT_API_URL } = await import('@/lib/config')
        const { getAuthHeaders } = await import('@/lib/auth')
        const response = await fetch(`${BOT_API_URL}/api/user-mappings`, {
          headers: getAuthHeaders(),
        })
        if (response.ok) {
          const data = await response.json()
          const userMapping = data.mappings.find((m: any) => m.displayName === userName)
          if (userMapping) {
            setUserRole(userMapping.role.toLowerCase())
            setIsAdmin(!!userMapping.isAdmin)
            if (userMapping.avatarUrl) {
              setAvatarUrl(userMapping.avatarUrl)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      }
    }

    fetchUserRole()
  }, [userName])

  const [currentTab, setCurrentTab] = React.useState('schedule')

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setCurrentTab(params.get('tab') || 'schedule')
    }
  }, [pathname])

  const handleNavigation = (tab: string) => {
    setCurrentTab(tab)
    router.push(`/?tab=${tab}`, { scroll: false })
  }

  const overviewItems: NavItem[] = [
    { title: "Schedule", tab: "schedule", icon: Home, isActive: currentTab === 'schedule' },
  ]

  const myScheduleItems: NavItem[] = [
    { title: "Availability", tab: "availability", icon: CalendarCheck, isActive: currentTab === 'availability' },
    { title: "Recurring", tab: "recurring", icon: RefreshCw, isActive: currentTab === 'recurring' },
    { title: "Absences", tab: "absences", icon: PlaneTakeoff, isActive: currentTab === 'absences' },
  ]

  const teamItems: NavItem[] = [
    { title: "Matches", tab: "matches", icon: Trophy, isActive: currentTab === 'matches' },

    { title: "Stratbook", tab: "stratbook", icon: BookOpen, isActive: currentTab === 'stratbook' },
    { title: "Statistics", tab: "statistics", icon: BarChart3, isActive: currentTab === 'statistics' },
  ]

  const user = userName ? {
    name: userName,
    email: "",
    avatar: avatarUrl,
  } : undefined

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrandingHeader
        title={branding.teamName}
        subtitle={branding.tagline}
        logoUrl={branding.logoUrl}
        fallbackIcon={Calendar}
        onClick={() => handleNavigation('schedule')}
      />
      <SidebarContent>
        <SidebarNavGroup label="Overview" items={overviewItems} onNavigate={handleNavigation} />
        <SidebarNavGroup label="My Schedule" items={myScheduleItems} onNavigate={handleNavigation} />
        <SidebarNavGroup label="Team" items={teamItems} onNavigate={handleNavigation} />
      </SidebarContent>
      <SidebarFooter>
        {isAdmin && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Admin Dashboard"
                onClick={() => router.push('/admin')}
              >
                <ShieldCheck />
                <span>Admin Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        {user && (
          <>
            {isAdmin && <SidebarSeparator className="mx-0" />}
            <NavUser user={user} onLogout={onLogout} role={userRole} />
          </>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
