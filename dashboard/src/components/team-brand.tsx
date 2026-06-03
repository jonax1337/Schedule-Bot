import { useNavigate } from 'react-router'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'

interface TeamBrandProps {
  name: string
  subtitle?: string
  logoUrl?: string
  fallbackIcon: React.ReactNode
  homeUrl?: string
}

export function TeamBrand({ name, subtitle, logoUrl, fallbackIcon, homeUrl = '/' }: TeamBrandProps) {
  const navigate = useNavigate()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          onClick={() => navigate(homeUrl)}
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
            {logoUrl ? <img src={logoUrl} alt="" className="size-full object-cover" /> : fallbackIcon}
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{name}</span>
            {subtitle && <span className="truncate text-xs">{subtitle}</span>}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
