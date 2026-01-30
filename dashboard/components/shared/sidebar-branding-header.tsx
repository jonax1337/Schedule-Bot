"use client"

import type { LucideIcon } from "lucide-react"
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

interface SidebarBrandingHeaderProps {
  title: string
  subtitle: string
  logoUrl: string
  fallbackIcon: LucideIcon
  onClick?: () => void
}

export function SidebarBrandingHeader({
  title,
  subtitle,
  logoUrl,
  fallbackIcon: FallbackIcon,
  onClick,
}: SidebarBrandingHeaderProps) {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" onClick={onClick}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={title}
                  className="size-4 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <FallbackIcon className="size-4" />
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{title}</span>
              <span className="truncate text-xs">{subtitle}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}
