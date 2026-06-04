import { useNavigate } from 'react-router'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'

// Body shapes inherit the surrounding text colour (currentColor) so the mark
// adapts to light/dark themes; the accent stays brand-violet.
const BODY = [
  '57.3 2.5 11.2 26 11.2 72.9 38 85.9 38 38.6 57.5 28.6 92.9 28.6 92.9 2.5',
  '112.1 18.9 102.7 18.9 102.7 48.1 138.8 48.1 138.8 18.9',
  '112.1 64.2 112.1 111.7 92.9 121.4 57.2 121.4 57.2 147.6 93.3 147.6 138.8 123.9 138.8 77.5',
  '57.3 41.6 57.3 68.6 92.9 68.6 92.9 41.6',
  '57.3 81.3 57.3 108.3 92.9 108.3 92.9 81.3',
  '11.2 101 11.2 131.1 47.2 131.1 47.2 101',
]
const ACCENT = [
  '105.8 9.8 92.9 9.8 92.9 19 124.2 18.9',
  '25.7 131 44 139.9 57.3 139.9 57.4 131.1',
  '38 59.1 38 85.9 57.3 95.2 57.3 68.7',
  '92.9 54.4 92.9 81.3 112.1 90.7 112.1 64.2',
]

export function SynqedMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 150" className={className} role="img" aria-label="Synqed">
      {BODY.map((p, i) => (
        <polygon key={`b${i}`} points={p} fill="currentColor" />
      ))}
      {ACCENT.map((p, i) => (
        <polygon key={`a${i}`} points={p} fill="#8B5CF6" />
      ))}
    </svg>
  )
}

export function SynqedBrand({ subtitle, homeUrl = '/' }: { subtitle?: string; homeUrl?: string }) {
  const navigate = useNavigate()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" onClick={() => navigate(homeUrl)}>
          <div className="flex aspect-square size-8 items-center justify-center flex-shrink-0">
            <SynqedMark className="size-7" />
          </div>
          <div className="grid flex-1 text-left leading-tight">
            <span
              className="truncate text-lg font-bold lowercase tracking-tight"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              synqed
            </span>
            {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
