import type { ReactNode } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppHeader } from '@/components/app-header'
import { AppSidebar, type AppSidebarProps } from '@/components/app-sidebar'
import type { AppBreadcrumbPage } from '@/components/app-breadcrumbs'

interface AppShellProps extends AppSidebarProps {
  page?: AppBreadcrumbPage | null
  headerRightSlot?: ReactNode
  children: ReactNode
}

export function AppShell({ page, headerRightSlot, children, ...sidebarProps }: AppShellProps) {
  return (
    <div className="overflow-hidden">
      <SidebarProvider className="relative h-svh">
        <AppSidebar {...sidebarProps} />
        <SidebarInset className="md:peer-data-[variant=inset]:ml-0">
          <AppHeader page={page} rightSlot={headerRightSlot} />
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
