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
    <div className="bg-amber-500/15 border-amber-500/50 text-amber-900 dark:text-amber-100 fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur">
      <FlaskConical className="size-3.5" />
      <span className="font-medium">LIVE DEMO</span>
      {user && (
        <span className="text-amber-700/80 dark:text-amber-300/80 hidden sm:inline">
          {user.username} · {user.role}
        </span>
      )}
      <Button
        size="xs"
        variant="ghost"
        className="text-amber-900 hover:bg-amber-500/20 dark:text-amber-100 h-6 gap-1 px-2"
        onClick={onReset}
      >
        <RotateCcw className="size-3" />
        <span className="hidden sm:inline">Reset</span>
      </Button>
      {user && (
        <Button
          size="xs"
          variant="ghost"
          className="text-amber-900 hover:bg-amber-500/20 dark:text-amber-100 h-6 gap-1 px-2"
          onClick={() => void logout()}
        >
          <LogOut className="size-3" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      )}
    </div>
  )
}
