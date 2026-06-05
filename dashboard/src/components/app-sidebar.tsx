import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavMain, type NavItem } from '@/components/nav-main'
import { NavUser, type NavUserInfo } from '@/components/nav-user'
import { SynqedBrand } from '@/components/synqed-brand'
import { OrgSwitcher } from '@/components/org-switcher'

export interface NavGroupConfig {
  label: string
  items: NavItem[]
}

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  brand: {
    subtitle?: string
    homeUrl?: string
  }
  navGroups: NavGroupConfig[]
  /** Optional row(s) rendered in the sidebar footer above the user pill. */
  footerExtra?: React.ReactNode
  user?: NavUserInfo
  onLogout?: () => void
}

export function AppSidebar({ brand, navGroups, footerExtra, user, onLogout, ...props }: AppSidebarProps) {
  const hasFooter = footerExtra || user
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrgSwitcher />
        <SynqedBrand subtitle={brand.subtitle} homeUrl={brand.homeUrl} />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      {hasFooter && (
        <SidebarFooter>
          {footerExtra}
          {user && <NavUser user={user} onLogout={onLogout} />}
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
