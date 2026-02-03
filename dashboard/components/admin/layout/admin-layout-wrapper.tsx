"use client"

import { AdminSidebar } from "./admin-sidebar"
import { LayoutWrapper, type LayoutWrapperConfig } from "@/components/shared/layout-wrapper"
import { getUser, logout } from '@/lib/auth'

interface AdminLayoutWrapperProps {
  children: React.ReactNode
}

const adminLayoutConfig: LayoutWrapperConfig = {
  Sidebar: AdminSidebar,
  tabLabels: {
    dashboard: 'Dashboard',
    statistics: 'Statistics',
    settings: 'Settings',
    users: 'Users',
    schedule: 'Schedule',
    scrims: 'Scrims',
    stratbook: 'Stratbook',
    actions: 'Actions',
    security: 'Security',
    logs: 'Logs',
  },
  defaultTab: 'dashboard',
  getUserName: () => {
    const user = getUser()
    return user?.username || null
  },
  onLogout: async (router) => {
    await logout()
    router.push('/')
  },
  hideBreadcrumbOnMobile: false,
}

export function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  return (
    <LayoutWrapper config={adminLayoutConfig}>
      {children}
    </LayoutWrapper>
  )
}
