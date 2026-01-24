"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"

interface AdminLayoutWrapperProps {
  children: React.ReactNode
}

export function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userName, setUserName] = useState<string | null>(null)
  const currentTab = searchParams.get('tab') || 'settings'

  useEffect(() => {
    const checkAuth = async () => {
      const { getUser } = await import('@/lib/auth')
      const user = getUser()
      if (user?.username) {
        setUserName(user.username)
      }
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    const { logout } = await import('@/lib/auth')
    await logout()
    router.push('/')
  }

  const tabLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    settings: 'Settings',
    users: 'Users',
    schedule: 'Schedule',
    scrims: 'Scrims',
    actions: 'Actions',
    security: 'Security',
    logs: 'Logs',
  }

  return (
    <SidebarProvider>
      <AdminSidebar userName={userName || undefined} onLogout={handleLogout} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin">
                  Admin Panel
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{tabLabels[currentTab] || 'Settings'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
