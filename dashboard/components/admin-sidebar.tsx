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
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { ThemeSwitcherSidebar } from "@/components/theme-switcher-sidebar"
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
        const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001'
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

  const navItems = [
    {
      title: "Dashboard",
      url: "/admin?tab=dashboard",
      icon: LayoutDashboard,
      isActive: currentTab === 'dashboard',
    },
    {
      title: "Settings",
      url: "/admin?tab=settings",
      icon: Settings,
      isActive: currentTab === 'settings',
    },
    {
      title: "Users",
      url: "/admin?tab=users",
      icon: Users,
      isActive: currentTab === 'users',
    },
    {
      title: "Schedule",
      url: "/admin?tab=schedule",
      icon: CalendarDays,
      isActive: currentTab === 'schedule',
    },
    {
      title: "Matches",
      url: "/admin?tab=scrims",
      icon: Trophy,
      isActive: currentTab === 'scrims',
    },
    {
      title: "Actions",
      url: "/admin?tab=actions",
      icon: Zap,
      isActive: currentTab === 'actions',
    },
    {
      title: "Security",
      url: "/admin?tab=security",
      icon: Shield,
      isActive: currentTab === 'security',
    },
    {
      title: "Logs",
      url: "/admin?tab=logs",
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
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const tab = item.url.split('tab=')[1]
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={item.isActive}
                      tooltip={item.title}
                      onClick={() => handleNavigation(tab)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <ThemeSwitcherSidebar />
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
