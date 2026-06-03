import { FlaskConical, ShieldCheck, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDevRole, setDevRole, type DevRole } from '@/lib/dev-mode'

export function DevModeBanner() {
  const role = getDevRole()
  const other: DevRole = role === 'admin' ? 'user' : 'admin'

  return (
    <div className="sticky top-0 z-[60] flex h-9 items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 text-xs text-amber-900 backdrop-blur dark:text-amber-200">
      <div className="flex items-center gap-2 font-medium">
        <FlaskConical className="h-3.5 w-3.5" />
        <span>DEV MODE — fetch is intercepted, all data is mocked</span>
        <span className="hidden text-amber-700/70 dark:text-amber-300/70 sm:inline">
          (set <code className="rounded bg-amber-500/20 px-1 py-0.5">VITE_DEV_MODE=false</code> to disable)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-amber-700/80 dark:text-amber-300/80 sm:inline">
          viewing as <strong>{role}</strong>
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-6 border-amber-500/50 bg-amber-500/10 px-2 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100"
          onClick={() => setDevRole(other)}
        >
          {other === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
          Switch to {other} view
        </Button>
      </div>
    </div>
  )
}
