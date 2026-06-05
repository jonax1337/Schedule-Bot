import { useEffect, useState } from 'react'
import { ChevronsUpDown, Check } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { BOT_API_URL } from '@/lib/config'
import { getAuthHeaders, teamHandoffUrl } from '@/lib/auth'
import { getTenantSlug } from '@/lib/tenant'

interface Org {
  slug: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}

/**
 * Workspace/team switcher at the top of the sidebar. Shows the current team's
 * logo (or initial) + name, and lets a member switch to any other team they
 * belong to. Switching navigates to the team's own subdomain, carrying the
 * login across origins via the server-issued handoff code.
 */
export function OrgSwitcher() {
  const { isMobile } = useSidebar()
  const current = getTenantSlug()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [team, setTeam] = useState<{ name: string; logoUrl: string }>({ name: current, logoUrl: '' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [orgsRes, settingsRes] = await Promise.all([
          fetch(`${BOT_API_URL}/api/platform/orgs`, { headers: getAuthHeaders() }),
          fetch(`${BOT_API_URL}/api/settings`, { headers: getAuthHeaders() }),
        ])
        if (cancelled) return
        if (orgsRes.ok) setOrgs((await orgsRes.json()).organizations ?? [])
        if (settingsRes.ok) {
          const s = await settingsRes.json()
          setTeam({ name: s?.branding?.teamName || current, logoUrl: s?.branding?.logoUrl || '' })
        }
      } catch {
        /* keep the slug as a fallback name */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [current])

  async function switchTo(slug: string) {
    if (slug === current) return
    window.location.href = await teamHandoffUrl(slug)
  }

  const initial = (team.name || current || '?').charAt(0).toUpperCase()
  const canSwitch = orgs.length > 1

  const trigger = (
    <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
      <Avatar className="size-8 rounded-md">
        {team.logoUrl ? <AvatarImage src={team.logoUrl} alt={team.name} /> : null}
        <AvatarFallback className="bg-primary text-primary-foreground rounded-md">{initial}</AvatarFallback>
      </Avatar>
      <span className="flex-1 truncate text-left text-sm font-semibold">{team.name}</span>
      {canSwitch && <ChevronsUpDown className="ml-auto size-4" />}
    </SidebarMenuButton>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {canSwitch ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56 rounded-lg" align="start" side={isMobile ? 'bottom' : 'right'}>
              <DropdownMenuLabel className="text-muted-foreground text-xs">Your teams</DropdownMenuLabel>
              {orgs.map((o) => (
                <DropdownMenuItem key={o.slug} onClick={() => switchTo(o.slug)} className="gap-2">
                  <span className="flex-1 truncate">{o.name}</span>
                  <span className="text-muted-foreground text-xs">{o.role.toLowerCase()}</span>
                  {o.slug === current && <Check className="size-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          trigger
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
