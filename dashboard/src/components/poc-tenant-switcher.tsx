import { useEffect, useState } from 'react'
import { getTenantSlug, setTenantSlug, getTenantHeader } from '@/lib/tenant'
import { getAuthToken } from '@/lib/auth'
import { BOT_API_URL } from '@/lib/config'

interface Org {
  slug: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}

/**
 * PoC-only: a floating org switcher. Lists only the orgs the logged-in account
 * is a member of (GET /api/platform/orgs), so it mirrors real access control —
 * picking an org you can't access is impossible. Hidden when signed out.
 * Remove once real subdomain routing + a proper switcher land.
 */
export function PocTenantSwitcher() {
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const current = getTenantSlug()

  useEffect(() => {
    if (!getAuthToken()) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${BOT_API_URL}/api/platform/orgs`, {
          headers: { Authorization: `Bearer ${getAuthToken()}`, ...getTenantHeader() },
        })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { organizations: Org[] }
        const list = data.organizations ?? []
        setOrgs(list)
        // If the active tenant isn't one we can access, snap to the first allowed one.
        if (list.length > 0 && !list.some((o) => o.slug === current)) {
          setTenantSlug(list[0].slug)
          window.location.reload()
        }
      } catch {
        /* ignore — switcher just stays hidden */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [current])

  function change(slug: string) {
    if (slug === current) return
    setTenantSlug(slug)
    window.location.reload()
  }

  // Hidden until we know the account's orgs (signed out, or none).
  if (!orgs || orgs.length === 0) return null

  return (
    <div className="fixed bottom-3 right-3 z-[9999] flex items-center gap-2 rounded-md border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <span className="font-medium text-muted-foreground">Team:</span>
      <select
        value={current}
        onChange={(e) => change(e.target.value)}
        className="rounded border bg-transparent px-1.5 py-0.5 text-foreground outline-none"
      >
        {orgs.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name} ({o.role.toLowerCase()})
          </option>
        ))}
      </select>
    </div>
  )
}
