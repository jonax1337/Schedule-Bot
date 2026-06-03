import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, UserCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AuthDivider } from '@/components/auth-divider'
import { FullWidthDivider } from '@/components/full-width-divider'
import { setAuthToken, setUser } from '@/lib/auth'
import { BOT_API_URL } from '@/lib/config'

interface LoginFormProps {
  redirectTo?: string | null
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<Array<{ displayName: string; discordId: string }>>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [loading, setLoading] = useState(true)
  const [allowDiscord, setAllowDiscord] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [discordLoading, setDiscordLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const settingsRes = await fetch(`${BOT_API_URL}/api/settings`)
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          setAllowDiscord(!!data?.discord?.allowDiscordAuth)
        }
      } catch (e) {
        console.error('settings load failed', e)
      } finally {
        setSettingsLoaded(true)
      }

      try {
        const res = await fetch(`${BOT_API_URL}/api/user-mappings`)
        if (res.ok) {
          const data = await res.json()
          setUsers(
            (data.mappings ?? []).map((m: { displayName: string; discordId: string }) => ({
              displayName: m.displayName,
              discordId: m.discordId,
            })),
          )
        }
      } catch (e) {
        console.error('mappings load failed', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleUserSelect = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setSubmitting(true)
    try {
      const response = await fetch(`${BOT_API_URL}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedUser }),
      })
      if (response.ok) {
        const data = await response.json()
        setAuthToken(data.token)
        setUser(data.user)
        localStorage.setItem('selectedUser', selectedUser)
        toast.success('Welcome back!')
        navigate(redirectTo || '/')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Login failed')
      }
    } catch (e) {
      console.error('login failed', e)
      toast.error('Failed to connect to server')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDiscordLogin = async () => {
    setDiscordLoading(true)
    if (redirectTo) localStorage.setItem('loginRedirect', redirectTo)
    try {
      const response = await fetch(`${BOT_API_URL}/api/auth/discord`)
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.url
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Failed to start Discord login')
        setDiscordLoading(false)
      }
    } catch (e) {
      console.error('discord init failed', e)
      toast.error('Failed to connect to server')
      setDiscordLoading(false)
    }
  }

  return (
    <div className="relative w-full overflow-hidden px-4 md:h-screen">
      <div className="*:px-6 relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center border-x">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md">
              <UserCircle className="size-5" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl font-semibold tracking-wide">Welcome back</h1>
              <p className="text-muted-foreground text-sm">
                {!settingsLoaded ? 'Loading…' : allowDiscord ? 'Sign in with Discord to continue.' : 'Pick your player profile to continue.'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative my-6 flex size-full flex-col gap-4 py-8">
          <FullWidthDivider position="top" />

          {!settingsLoaded ? (
            <div className="flex justify-center py-6">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : allowDiscord ? (
            <>
              <Button type="button" className="w-full" onClick={handleDiscordLogin} disabled={discordLoading}>
                {discordLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Connecting…
                  </>
                ) : (
                  <>
                    <DiscordIcon className="size-4" />
                    Continue with Discord
                  </>
                )}
              </Button>
              <AuthDivider>OR PICK A PLAYER</AuthDivider>
              <PlayerPicker
                users={users}
                loading={loading}
                value={selectedUser}
                onChange={setSelectedUser}
                onSubmit={handleUserSelect}
                submitting={submitting}
              />
            </>
          ) : (
            <PlayerPicker
              users={users}
              loading={loading}
              value={selectedUser}
              onChange={setSelectedUser}
              onSubmit={handleUserSelect}
              submitting={submitting}
            />
          )}

          <FullWidthDivider position="bottom" />
        </div>

        <p className="text-muted-foreground text-center text-sm">
          Your selection is remembered on this device.{' '}
          <a href="/admin/login" className="text-foreground hover:underline">
            Admin sign-in
          </a>
        </p>
      </div>
    </div>
  )
}

function PlayerPicker({
  users,
  loading,
  value,
  onChange,
  onSubmit,
  submitting,
}: {
  users: Array<{ displayName: string; discordId: string }>
  loading: boolean
  value: string
  onChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  submitting: boolean
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Field>
        <Label htmlFor="user-select" className="sr-only">
          Player
        </Label>
        <Select value={value} onValueChange={onChange} disabled={loading}>
          <SelectTrigger id="user-select" className="w-full">
            <SelectValue placeholder={loading ? 'Loading…' : 'Select your name'} />
          </SelectTrigger>
          <SelectContent position="popper">
            {users.map((u, i) => (
              <SelectItem key={u.discordId || i} value={u.displayName}>
                {u.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Button type="submit" size="sm" className="w-full" disabled={!value || loading || submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Signing in…
          </>
        ) : (
          'Continue'
        )}
      </Button>
    </form>
  )
}

function DiscordIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 71 55" fill="currentColor" {...props}>
      <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 43.7636 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" />
    </svg>
  )
}
