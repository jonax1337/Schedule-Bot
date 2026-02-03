"use client"

import { UserSidebar } from "./user-sidebar"
import { LayoutWrapper, type LayoutWrapperConfig } from "@/components/shared/layout-wrapper"

interface UserLayoutWrapperProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

const userLayoutConfig: LayoutWrapperConfig = {
  Sidebar: UserSidebar,
  tabLabels: {
    schedule: 'Schedule',
    availability: 'Availability',
    recurring: 'Recurring',
    absences: 'Absences',
    matches: 'Matches',
    stratbook: 'Stratbook',
    statistics: 'Statistics',
  },
  defaultTab: 'schedule',
  getUserName: () => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('selectedUser')
  },
  onLogout: async (router) => {
    // Only remove user session, keep admin token if exists
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedUser')
      localStorage.removeItem('sessionToken')
    }
    router.push('/login')
  },
  hideBreadcrumbOnMobile: true,
}

export function UserLayoutWrapper({ children }: UserLayoutWrapperProps) {
  return (
    <LayoutWrapper config={userLayoutConfig}>
      {children}
    </LayoutWrapper>
  )
}
