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
  ArrowLeft,
  LayoutDashboard,
  BarChart3,
  Map,
  BookOpen,
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

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userName?: string
  onLogout?: () => void
}

export function AdminSidebar({ userName, onLogout, ...props }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [currentTab, setCurrentTab] = React.useState('dashboard')
  const branding = useBranding({ tagline: 'Bot Configuration' })

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

  const overviewItems: NavItem[] = [
    { title: "Dashboard", tab: "dashboard", icon: LayoutDashboard, isActive: currentTab === 'dashboard' },
    { title: "Statistics", tab: "statistics", icon: BarChart3, isActive: currentTab === 'statistics' },
  ]

  const scheduleItems: NavItem[] = [
    { title: "Schedule", tab: "schedule", icon: CalendarDays, isActive: currentTab === 'schedule' },
    { title: "Users", tab: "users", icon: Users, isActive: currentTab === 'users' },
  ]

  const competitiveItems: NavItem[] = [
    { title: "Matches", tab: "scrims", icon: Trophy, isActive: currentTab === 'scrims' },
    { title: "Map Veto", tab: "map-veto", icon: Map, isActive: currentTab === 'map-veto' },
    { title: "Stratbook", tab: "stratbook", icon: BookOpen, isActive: currentTab === 'stratbook' },
  ]

  const systemItems: NavItem[] = [
    { title: "Settings", tab: "settings", icon: Settings, isActive: currentTab === 'settings' },
    { title: "Actions", tab: "actions", icon: Zap, isActive: currentTab === 'actions' },
    { title: "Security", tab: "security", icon: Shield, isActive: currentTab === 'security' },
    { title: "Logs", tab: "logs", icon: Terminal, isActive: currentTab === 'logs' },
  ]

  const user = userName ? {
    name: userName,
    email: "Admin",
    avatar: "",
  } : undefined

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrandingHeader
        title="Admin Panel"
        subtitle={branding.tagline}
        logoUrl={branding.logoUrl}
        fallbackIcon={Shield}
        onClick={() => handleNavigation('dashboard')}
      />
      <SidebarContent>
        <SidebarNavGroup label="Overview" items={overviewItems} onNavigate={handleNavigation} />
        <SidebarNavGroup label="Schedule" items={scheduleItems} onNavigate={handleNavigation} />
        <SidebarNavGroup label="Competitive" items={competitiveItems} onNavigate={handleNavigation} />
        <SidebarNavGroup label="System" items={systemItems} onNavigate={handleNavigation} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Back to Schedule"
              onClick={() => router.push('/')}
            >
              <ArrowLeft />
              <span>Back to Schedule</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {user && (
          <>
            <SidebarSeparator />
            <NavUser user={user} onLogout={onLogout} />
          </>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
