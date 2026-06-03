import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { AppBreadcrumbs, type AppBreadcrumbPage } from '@/components/app-breadcrumbs'
import { CustomSidebarTrigger } from '@/components/custom-sidebar-trigger'

interface AppHeaderProps {
  page?: AppBreadcrumbPage | null
  rightSlot?: React.ReactNode
}

export function AppHeader({ page, rightSlot }: AppHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 md:px-6',
      )}
    >
      <div className="flex items-center gap-3">
        <CustomSidebarTrigger />
        <Separator
          className="mr-2 h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <AppBreadcrumbs page={page} />
      </div>
      <div className="flex items-center gap-3">{rightSlot}</div>
    </header>
  )
}
