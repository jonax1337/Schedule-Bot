import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavMain, type NavItem } from '@/components/nav-main'
import { NavUser, type NavUserInfo } from '@/components/nav-user'
import { TeamBrand } from '@/components/team-brand'

export interface NavGroupConfig {
  label: string
  items: NavItem[]
}

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  brand: {
    name: string
    subtitle?: string
    logoUrl?: string
    fallbackIcon: React.ReactNode
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
        <TeamBrand
          name={brand.name}
          subtitle={brand.subtitle}
          logoUrl={brand.logoUrl}
          fallbackIcon={brand.fallbackIcon}
          homeUrl={brand.homeUrl}
        />
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
