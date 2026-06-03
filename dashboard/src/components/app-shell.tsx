import type { ReactNode } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppSidebar, type AppSidebarProps } from '@/components/app-sidebar'

interface AppShellProps extends AppSidebarProps {
  pageTitle?: string
  pageIcon?: ReactNode
  children: ReactNode
}

export function AppShell({ pageTitle, pageIcon, children, ...sidebarProps }: AppShellProps) {
  return (
    <SidebarProvider className="h-svh">
      <AppSidebar {...sidebarProps} />
      <SidebarInset className="min-h-0">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {pageTitle && (
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="flex items-center gap-2 [&>svg]:size-4">
                      {pageIcon}
                      {pageTitle}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
        </header>
        {/* min-h-0 + overflow-y-auto: pages that overflow scroll inside the
            inset (no whole-page scrollbar); pages that opt into h-full with
            their own internal layout (e.g. UserSchedule) just fill exactly. */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
