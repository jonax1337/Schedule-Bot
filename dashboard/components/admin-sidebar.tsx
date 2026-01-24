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

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setCurrentTab(params.get('tab') || 'dashboard')
    }
  }, [pathname])

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

  const quickLinks = [
    {
      title: "Back to Schedule",
      url: "/",
      icon: ArrowLeft,
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
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Admin Panel</span>
                <span className="truncate text-xs">Bot Configuration</span>
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
        <SidebarGroup>
          <SidebarGroupLabel>Quick Links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickLinks.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    tooltip={item.title}
                    onClick={handleBackToSchedule}
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
        <ThemeSwitcherSidebar />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
