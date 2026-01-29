"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Calendar,
  CalendarCheck,
  Trophy,
  Shield,
  LogOut,
  User,
  Home,
  BarChart3,
  PlaneTakeoff,
  Map,
} from "lucide-react"

import { NavUser } from "@/components/shared"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import Image from "next/image"

interface UserSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userName?: string
  onLogout?: () => void
}

export function UserSidebar({ userName, onLogout, ...props }: UserSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = React.useState<string | undefined>(undefined)
  const [avatarUrl, setAvatarUrl] = React.useState("")
  const [teamName, setTeamName] = React.useState<string>('Valorant Bot')
  const [tagline, setTagline] = React.useState<string>('Schedule Manager')
  const [logoUrl, setLogoUrl] = React.useState<string>('')

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

  React.useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { BOT_API_URL } = await import('@/lib/config')
        const response = await fetch(`${BOT_API_URL}/api/settings`)
        if (response.ok) {
          const data = await response.json()
          if (data?.branding) {
            setTeamName(data.branding.teamName || 'Valorant Bot')
            setTagline(data.branding.tagline || 'Schedule Manager')
            setLogoUrl(data.branding.logoUrl || '')
          }
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error)
      }
    }

    fetchBranding()
  }, [])

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

  const scheduleItems = [
    {
      title: "Schedule",
      tab: "schedule",
      icon: Home,
      isActive: currentTab === 'schedule',
    },
    {
      title: "My Availability",
      tab: "availability",
      icon: CalendarCheck,
      isActive: currentTab === 'availability',
    },
    {
      title: "Absences",
      tab: "absences",
      icon: PlaneTakeoff,
      isActive: currentTab === 'absences',
    },
  ]

  const competitiveItems = [
    {
      title: "Match History",
      tab: "matches",
      icon: Trophy,
      isActive: currentTab === 'matches',
    },
    {
      title: "Map Veto",
      tab: "map-veto",
      icon: Map,
      isActive: currentTab === 'map-veto',
    },
    {
      title: "Statistics",
      tab: "statistics",
      icon: BarChart3,
      isActive: currentTab === 'statistics',
    },
  ]

  const handleAdminNavigation = async () => {
    // Check if admin is already logged in
    const { getUser } = await import('@/lib/auth')
    const user = getUser()

    if (user && user.role === 'admin') {
      // Already logged in as admin, go directly to admin dashboard
      router.push('/admin?tab=dashboard')
    } else {
      // Not logged in as admin, go to login page
      router.push('/admin/login')
    }
  }

  const user = userName ? {
    name: userName,
    email: "",
    avatar: avatarUrl,
  } : undefined

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => handleNavigation('schedule')}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={teamName}
                    className="size-4 object-contain"
                    onError={(e) => {
                      // Fallback to Calendar icon if image fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                {!logoUrl && <Calendar className="size-4" />}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{teamName}</span>
                <span className="truncate text-xs">{tagline}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Schedule</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {scheduleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={item.isActive}
                    tooltip={item.title}
                    onClick={() => handleNavigation(item.tab)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Competitive</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {competitiveItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={item.isActive}
                    tooltip={item.title}
                    onClick={() => handleNavigation(item.tab)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Admin Panel"
              onClick={handleAdminNavigation}
            >
              <Shield />
              <span>Admin Panel</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {user && <NavUser user={user} onLogout={onLogout} role={userRole} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
