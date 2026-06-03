import { FlaskConical, LogOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getUser, logout } from '@/lib/auth'
import { resetMockState } from '@/lib/mock/store'

export function DevModeBanner() {
  const user = getUser()

  const onReset = () => {
    if (!window.confirm('Reset all demo data? This wipes any edits you made in this tab.')) return
    resetMockState()
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('selectedUser')
    window.location.assign('/')
  }

  return (
    <div className="bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200 sticky top-0 z-[60] flex h-9 items-center justify-between gap-3 border-b px-4 text-xs backdrop-blur">
      <div className="flex items-center gap-2 font-medium">
        <FlaskConical className="size-3.5" />
        <span>LIVE DEMO — fully mocked, edits persist for this tab only</span>
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <span className="text-amber-700/80 dark:text-amber-300/80 hidden sm:inline">
            signed in as <strong>{user.username}</strong> ({user.role})
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          className="bg-amber-500/10 border-amber-500/50 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100 h-6 px-2"
          onClick={onReset}
        >
          <RotateCcw className="size-3" />
          Reset
        </Button>
        {user && (
          <Button
            size="sm"
            variant="outline"
            className="bg-amber-500/10 border-amber-500/50 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100 h-6 px-2"
            onClick={() => void logout()}
          >
            <LogOut className="size-3" />
            Sign out
          </Button>
        )}
      </div>
    </div>
  )
}
