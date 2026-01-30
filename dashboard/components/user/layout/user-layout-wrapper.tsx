"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { UserSidebar } from "./user-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme"
import { BreadcrumbProvider, useBreadcrumbSub } from "@/lib/breadcrumb-context"

interface UserLayoutWrapperProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export function UserLayoutWrapper({ children, breadcrumbs = [] }: UserLayoutWrapperProps) {
  return (
    <BreadcrumbProvider>
      <UserLayoutWrapperInner breadcrumbs={breadcrumbs}>{children}</UserLayoutWrapperInner>
    </BreadcrumbProvider>
  )
}

function UserLayoutWrapperInner({ children, breadcrumbs = [] }: UserLayoutWrapperProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userName, setUserName] = useState<string | null>(null)
  const currentTab = searchParams.get('tab') || 'schedule'

  // Read sidebar state from cookie (client-side only, will cause hydration warning but we suppress it)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true // SSR default
    const cookies = document.cookie.split('; ')
    const sidebarCookie = cookies.find(c => c.startsWith('sidebar_state='))
    return sidebarCookie ? sidebarCookie.split('=')[1] === 'true' : true
  })

  const { subPage } = useBreadcrumbSub()

  const tabLabels: Record<string, string> = {
    schedule: 'Schedule',
    availability: 'Availability',
    recurring: 'Recurring',
    absences: 'Absences',
    matches: 'Matches',
    stratbook: 'Stratbook',
    statistics: 'Statistics',
  }

  useEffect(() => {
    const user = localStorage.getItem('selectedUser')
    if (user) {
      setUserName(user)
    }
  }, [])

  const handleLogout = async () => {
    // Only remove user session, keep admin token if exists
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedUser')
      localStorage.removeItem('sessionToken')
    }
    router.push('/login')
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <UserSidebar userName={userName || undefined} onLogout={handleLogout} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                {subPage ? (
                  <BreadcrumbLink className="cursor-pointer" onClick={subPage.onNavigateBack}>
                    {tabLabels[currentTab] || 'Schedule'}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{tabLabels[currentTab] || 'Schedule'}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {subPage && (
                <>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbPage>{subPage.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
