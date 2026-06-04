import { getTenantSlug, setTenantSlug } from '@/lib/tenant'

/**
 * PoC-only: a floating tenant switcher so you can flip between orgs locally
 * (where there are no real subdomains) and watch the data change. Lives in the
 * corner; remove once real subdomain routing is wired.
 */
const TENANTS = [
  { slug: 'default', label: 'WGW Gold (default)' },
  { slug: 'g2', label: 'G2 Esports' },
]

export function PocTenantSwitcher() {
  const current = getTenantSlug()

  function change(slug: string) {
    if (slug === current) return
    setTenantSlug(slug)
    // Hard reload so every cached query refetches under the new tenant.
    window.location.reload()
  }

  return (
    <div className="fixed bottom-3 right-3 z-[9999] flex items-center gap-2 rounded-md border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <span className="font-medium text-muted-foreground">Tenant:</span>
      <select
        value={current}
        onChange={(e) => change(e.target.value)}
        className="rounded border bg-transparent px-1.5 py-0.5 text-foreground outline-none"
      >
        {TENANTS.map((t) => (
          <option key={t.slug} value={t.slug}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  )
}
