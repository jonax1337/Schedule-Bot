"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Settings,
  Users,
  CalendarDays,
  Trophy,
  Zap,
  Shield,
  Terminal,
  Calendar,
  ArrowLeft,
  LayoutDashboard,
  BarChart3,
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

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userName?: string
  onLogout?: () => void
}

export function AdminSidebar({ userName, onLogout, ...props }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [currentTab, setCurrentTab] = React.useState('dashboard')
  const [tagline, setTagline] = React.useState<string>('Bot Configuration')
  const [logoUrl, setLogoUrl] = React.useState<string>('')

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setCurrentTab(params.get('tab') || 'dashboard')
    }
  }, [pathname])

  React.useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { BOT_API_URL } = await import('@/lib/config')
        const response = await fetch(`${BOT_API_URL}/api/settings`)
        if (response.ok) {
          const data = await response.json()
          if (data?.branding) {
            setTagline(data.branding.tagline || 'Bot Configuration')
            setLogoUrl(data.branding.logoUrl || '')
          }
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error)
      }
    }

    fetchBranding()
  }, [])

  const handleNavigation = (tab: string) => {
    setCurrentTab(tab)
    router.push(`/admin?tab=${tab}`, { scroll: false })
  }

  const handleBackToSchedule = () => {
    router.push('/')
  }

  const overviewItems = [
    {
      title: "Dashboard",
      tab: "dashboard",
      icon: LayoutDashboard,
      isActive: currentTab === 'dashboard',
    },
    {
      title: "Statistics",
      tab: "statistics",
      icon: BarChart3,
      isActive: currentTab === 'statistics',
    },
  ]

  const teamItems = [
    {
      title: "Schedule",
      tab: "schedule",
      icon: CalendarDays,
      isActive: currentTab === 'schedule',
    },
    {
      title: "Users",
      tab: "users",
      icon: Users,
      isActive: currentTab === 'users',
    },
    {
      title: "Matches",
      tab: "scrims",
      icon: Trophy,
      isActive: currentTab === 'scrims',
    },
    {
      title: "Map Veto",
      tab: "map-veto",
      icon: Map,
      isActive: currentTab === 'map-veto',
    },
  ]

  const systemItems = [
    {
      title: "Settings",
      tab: "settings",
      icon: Settings,
      isActive: currentTab === 'settings',
    },
    {
      title: "Actions",
      tab: "actions",
      icon: Zap,
      isActive: currentTab === 'actions',
    },
    {
      title: "Security",
      tab: "security",
      icon: Shield,
      isActive: currentTab === 'security',
    },
    {
      title: "Logs",
      tab: "logs",
      icon: Terminal,
      isActive: currentTab === 'logs',
    },
  ]


  const user = userName ? {
    name: userName,
    email: "Admin",
    avatar: "",
  } : undefined

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => handleNavigation('dashboard')}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Admin Panel"
                    className="size-4 object-contain"
                    onError={(e) => {
                      // Fallback to Shield icon if image fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                {!logoUrl && <Shield className="size-4" />}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Admin Panel</span>
                <span className="truncate text-xs">{tagline}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => (
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
          <SidebarGroupLabel>Team</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {teamItems.map((item) => (
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
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
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
              tooltip="Back to Schedule"
              onClick={handleBackToSchedule}
            >
              <ArrowLeft />
              <span>Back to Schedule</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
