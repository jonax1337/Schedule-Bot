"use client"

import { useEffect, useState, ReactNode, ComponentType } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme"
import { BreadcrumbProvider, useBreadcrumbSub } from "@/lib/breadcrumb-context"

/**
 * Props for the sidebar component
 */
export interface SidebarProps {
  userName?: string
  onLogout: () => void
}

/**
 * Configuration for the layout wrapper
 */
export interface LayoutWrapperConfig {
  /** Sidebar component to render */
  Sidebar: ComponentType<SidebarProps>
  /** Tab labels for breadcrumb display */
  tabLabels: Record<string, string>
  /** Default tab if none specified */
  defaultTab: string
  /** Function to get the current user name */
  getUserName: () => string | null
  /** Function to handle logout */
  onLogout: (router: ReturnType<typeof useRouter>) => Promise<void>
  /** Whether to hide breadcrumb on mobile (default: false for admin, true for user) */
  hideBreadcrumbOnMobile?: boolean
}

interface LayoutWrapperProps {
  children: ReactNode
  config: LayoutWrapperConfig
}

/**
 * Generic layout wrapper that provides common functionality for admin and user layouts
 * Reduces code duplication between AdminLayoutWrapper and UserLayoutWrapper
 */
export function LayoutWrapper({ children, config }: LayoutWrapperProps) {
  return (
    <BreadcrumbProvider>
      <LayoutWrapperInner config={config}>{children}</LayoutWrapperInner>
    </BreadcrumbProvider>
  )
}

function LayoutWrapperInner({ children, config }: LayoutWrapperProps) {
  const {
    Sidebar,
    tabLabels,
    defaultTab,
    getUserName,
    onLogout,
    hideBreadcrumbOnMobile = false,
  } = config

  const router = useRouter()
  const searchParams = useSearchParams()
  const [userName, setUserName] = useState<string | null>(null)
  const currentTab = searchParams.get('tab') || defaultTab

  // Read sidebar state from cookie (client-side only)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true // SSR default
    const cookies = document.cookie.split('; ')
    const sidebarCookie = cookies.find(c => c.startsWith('sidebar_state='))
    return sidebarCookie ? sidebarCookie.split('=')[1] === 'true' : true
  })

  const { subPage } = useBreadcrumbSub()

  useEffect(() => {
    const name = getUserName()
    if (name) {
      setUserName(name)
    }
  }, [getUserName])

  const handleLogout = async () => {
    await onLogout(router)
  }

  // CSS classes for conditional mobile visibility
  const mobileHiddenClass = hideBreadcrumbOnMobile ? 'hidden md:block' : ''
  const mobileContentsClass = hideBreadcrumbOnMobile ? 'contents hidden md:contents' : 'contents'

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar userName={userName || undefined} onLogout={handleLogout} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className={mobileHiddenClass}>
                {subPage ? (
                  <BreadcrumbLink className="cursor-pointer" onClick={subPage.onNavigateBack}>
                    {tabLabels[currentTab] || tabLabels[defaultTab] || defaultTab}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{tabLabels[currentTab] || tabLabels[defaultTab] || defaultTab}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {subPage?.trail?.map((item, i) => (
                <span key={i} className={mobileContentsClass}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink className="cursor-pointer" onClick={item.onClick}>
                      {item.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </span>
              ))}
              {subPage && (
                <>
                  <BreadcrumbSeparator className={mobileHiddenClass} />
                  <BreadcrumbItem className={mobileHiddenClass}>
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
