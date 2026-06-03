import type { ReactNode } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { NavGroup } from '@/components/nav-group'
import { NavUser, type NavUserInfo } from '@/components/nav-user'
import type { SidebarNavGroup, SidebarNavItem } from '@/components/app-shared'

export interface AppSidebarProps {
  brandTitle: string
  brandSubtitle?: string
  brandIcon: ReactNode
  brandLogoUrl?: string
  onBrandClick?: () => void
  navGroups: SidebarNavGroup[]
  footerNavLinks?: SidebarNavItem[]
  footerExtra?: ReactNode
  user?: NavUserInfo
  onLogout?: () => void
}

export function AppSidebar({
  brandTitle,
  brandSubtitle,
  brandIcon,
  brandLogoUrl,
  onBrandClick,
  navGroups,
  footerNavLinks,
  footerExtra,
  user,
  onLogout,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenuButton onClick={onBrandClick} className="cursor-pointer">
          {brandLogoUrl ? (
            <img src={brandLogoUrl} alt="" className="size-5 rounded" />
          ) : (
            brandIcon
          )}
          <div className="flex flex-col leading-tight">
            <span className="font-medium">{brandTitle}</span>
            {brandSubtitle && (
              <span className="text-muted-foreground text-xs">{brandSubtitle}</span>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group, index) => (
          <NavGroup key={`sidebar-group-${index}`} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        {footerExtra}
        {footerNavLinks && footerNavLinks.length > 0 && (
          <SidebarMenu className="mt-2">
            {footerNavLinks.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className="text-muted-foreground"
                  isActive={item.isActive}
                  size="sm"
                >
                  <a href={item.path}>
                    {item.icon}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
        {user && (
          <>
            <SidebarSeparator className="mx-0" />
            <div className="px-2 py-1">
              <NavUser user={user} onLogout={onLogout} />
            </div>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
