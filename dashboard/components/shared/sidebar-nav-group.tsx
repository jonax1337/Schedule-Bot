"use client"

import type { LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

export interface NavItem {
  title: string
  tab: string
  icon: LucideIcon
  isActive: boolean
}

interface SidebarNavGroupProps {
  label: string
  items: NavItem[]
  onNavigate: (tab: string) => void
}

export function SidebarNavGroup({ label, items, onNavigate }: SidebarNavGroupProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.tab}>
              <SidebarMenuButton
                isActive={item.isActive}
                tooltip={item.title}
                onClick={() => onNavigate(item.tab)}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
