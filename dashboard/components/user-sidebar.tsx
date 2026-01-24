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
import Image from "next/image"

interface UserSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userName?: string
  onLogout?: () => void
}

export function UserSidebar({ userName, onLogout, ...props }: UserSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    const fetchUserRole = async () => {
      if (!userName) return
      
      try {
        const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001'
        const response = await fetch(`${BOT_API_URL}/api/user-mappings`)
        if (response.ok) {
          const data = await response.json()
          const userMapping = data.mappings.find((m: any) => m.displayName === userName)
          if (userMapping) {
            setUserRole(userMapping.role.toLowerCase())
          }
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      }
    }
    
    fetchUserRole()
  }, [userName])

  const navItems = [
    {
      title: "Schedule",
      url: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      title: "My Availability",
      url: "/user",
      icon: CalendarCheck,
      isActive: pathname === "/user",
    },
    {
      title: "Match History",
      url: "/matches",
      icon: Trophy,
      isActive: pathname === "/matches",
    },
  ]

  const adminItems = [
    {
      title: "Admin Panel",
      url: "/admin/login",
      icon: Shield,
    },
  ]

  const user = userName ? {
    name: userName,
    email: "",
    avatar: "",
  } : undefined

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Calendar className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Valorant Bot</span>
                  <span className="truncate text-xs">Schedule Manager</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.isActive}
                    tooltip={item.title}
                  >
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <ThemeSwitcherSidebar />
        {user && <NavUser user={user} onLogout={onLogout} role={userRole} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
