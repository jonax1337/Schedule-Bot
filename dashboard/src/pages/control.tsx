import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SynqedMark } from '@/components/synqed-brand'
import { FullWidthDivider } from '@/components/full-width-divider'
import { AuthDivider } from '@/components/auth-divider'
import { Loader2, Plus, ArrowRight, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { BOT_API_URL } from '@/lib/config'
import { getAuthToken, getUser, setAuthToken, setUser, removeAuthToken, startDiscordLogin } from '@/lib/auth'
import { subdomainUrl } from '@/lib/tenant'

interface Org {
  slug: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}

const ORBITRON = { fontFamily: "'Orbitron', sans-serif" } as const

function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`lowercase font-bold tracking-tight ${className}`} style={ORBITRON}>
      synqed
    </span>
  )
}

function DiscordIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 71 55" fill="currentColor" {...props}>
      <path d="M60.1 4.9A58.5 58.5 0 0 0 45.65.42a.22.22 0 0 0-.23.1c-.62 1.1-1.31 2.55-1.8 3.69a54 54 0 0 0-16.23 0 37 37 0 0 0-1.83-3.7.23.23 0 0 0-.23-.1A58.4 58.4 0 0 0 10.88 4.9a.2.2 0 0 0-.1.08C1.58 18.73-.94 32.14.3 45.39a.24.24 0 0 0 .09.17 58.8 58.8 0 0 0 17.8 9 .23.23 0 0 0 .25-.08 42 42 0 0 0 3.64-5.92.22.22 0 0 0-.12-.31 38.7 38.7 0 0 1-5.53-2.64.23.23 0 0 1-.02-.38c.37-.28.74-.57 1.1-.86a.22.22 0 0 1 .23-.03 41.9 41.9 0 0 0 35.68 0 .22.22 0 0 1 .23.02c.36.3.73.59 1.1.87a.23.23 0 0 1-.02.38 36.3 36.3 0 0 1-5.53 2.63.23.23 0 0 0-.12.32 47 47 0 0 0 3.64 5.91.23.23 0 0 0 .25.09 58.6 58.6 0 0 0 17.83-9 .23.23 0 0 0 .09-.17c1.48-15.32-2.48-28.62-10.5-40.42a.18.18 0 0 0-.1-.08ZM23.73 37.33c-3.5 0-6.38-3.21-6.38-7.16 0-3.94 2.82-7.15 6.38-7.15 3.58 0 6.43 3.24 6.38 7.15 0 3.95-2.83 7.16-6.38 7.16Zm23.59 0c-3.5 0-6.38-3.21-6.38-7.16 0-3.94 2.82-7.15 6.38-7.15 3.58 0 6.43 3.24 6.38 7.15 0 3.95-2.8 7.16-6.38 7.16Z" />
    </svg>
  )
}

/**
 * Control plane (synqed.org): the SaaS entry. Sign in, see the teams you belong
 * to, create a new team. The team app itself lives on each team's subdomain.
 */
export function ControlPage() {
  const [token, setToken] = useState<string | null>(getAuthToken())
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const [devName, setDevName] = useState('')
  const [slug, setSlug] = useState('')
  const [teamName, setTeamName] = useState('')
  const [busy, setBusy] = useState(false)
  const accountName = getUser()?.username

  async function loadOrgs(tok: string) {
    try {
      const res = await fetch(`${BOT_API_URL}/api/platform/orgs`, { headers: { Authorization: `Bearer ${tok}` } })
      if (res.ok) setOrgs((await res.json()).organizations ?? [])
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (token) loadOrgs(token)
  }, [token])

  useEffect(() => {
    const bot = new URLSearchParams(window.location.search).get('bot')
    if (bot === 'connected') toast.success('Discord connected to your team')
    else if (bot === 'error') toast.error('Discord connection failed — please try again')
    if (bot) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  async function devLogin(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch(`${BOT_API_URL}/api/platform/account/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: devName || 'Dev User' }),
      })
      if (!res.ok) throw new Error('Dev login disabled (set ALLOW_DEV_LOGIN=1)')
      const data = await res.json()
      setAuthToken(data.token)
      setUser(data.user)
      setToken(data.token)
      toast.success(`Signed in as ${data.user.username}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dev login failed')
    } finally {
      setBusy(false)
    }
  }

  async function discordLogin() {
    try {
      await startDiscordLogin('control')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Discord login unavailable')
    }
  }

  async function createTeam(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setBusy(true)
    try {
      const res = await fetch(`${BOT_API_URL}/api/platform/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug, name: teamName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create team')
      toast.success(`Team "${data.organization.name}" created`)
      setSlug('')
      setTeamName('')
      loadOrgs(token)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create team')
    } finally {
      setBusy(false)
    }
  }

  function openTeam(s: string) {
    // Open the team in its own context — the user signs in there (separate session).
    window.location.href = subdomainUrl(s, '/')
  }

  async function connectDiscord(s: string) {
    if (!token) return
    try {
      const res = await fetch(`${BOT_API_URL}/api/platform/organizations/${s}/invite`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start Discord connect')
      window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not connect Discord')
    }
  }

  function signOut() {
    removeAuthToken()
    setToken(null)
    setOrgs(null)
  }

  // --- Signed out: same centered look as the team-dashboard login ---
  if (!token) {
    return (
      <div className="relative w-full overflow-hidden px-4 md:h-screen">
        <div className="*:px-6 relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center border-x">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md">
                <SynqedMark className="size-6" />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-xl tracking-wide">
                  Welcome to <Wordmark />
                </h1>
                <p className="text-muted-foreground text-sm">Sign in to manage your teams.</p>
              </div>
            </div>
          </div>

          <div className="relative my-6 flex size-full flex-col gap-4 py-8">
            <FullWidthDivider position="top" />
            <Button type="button" className="w-full" onClick={discordLogin}>
              <DiscordIcon className="size-4" /> Continue with Discord
            </Button>
            {import.meta.env.DEV && (
              <>
                <AuthDivider>OR DEV LOGIN</AuthDivider>
                <form onSubmit={devLogin} className="flex gap-2">
                  <Input placeholder="Your name" value={devName} onChange={(e) => setDevName(e.target.value)} />
                  <Button type="submit" variant="secondary" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : 'Dev login'}
                  </Button>
                </form>
              </>
            )}
            <FullWidthDivider position="bottom" />
          </div>
        </div>
      </div>
    )
  }

  // --- Signed in: teams + create ---
  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-4 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SynqedMark className="text-foreground size-7" />
            <div>
              <Wordmark className="text-xl" />
              <div className="text-muted-foreground text-xs">Team scheduling control plane</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {accountName && <span className="text-muted-foreground">{accountName}</span>}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </header>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your teams</CardTitle>
              <CardDescription>Open a team to manage it, or connect its Discord server.</CardDescription>
            </CardHeader>
            <CardContent>
              {orgs === null ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                </div>
              ) : orgs.length === 0 ? (
                <p className="text-muted-foreground py-2 text-sm">No teams yet — create your first one below.</p>
              ) : (
                <ul className="divide-border divide-y">
                  {orgs.map((o) => (
                    <li key={o.slug} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <Avatar className="size-9 rounded-md">
                        <AvatarFallback className="bg-primary text-primary-foreground rounded-md">
                          {o.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{o.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {o.slug}.synqed.org · {o.role.toLowerCase()}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => connectDiscord(o.slug)}>
                        Connect Discord
                      </Button>
                      <Button size="sm" onClick={() => openTeam(o.slug)}>
                        Open <ArrowRight className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create a team</CardTitle>
              <CardDescription>Each team gets its own subdomain and Discord connection.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createTeam} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="slug">Subdomain</Label>
                  <div className="flex items-center gap-1.5">
                    <Input id="slug" placeholder="my-team" value={slug} onChange={(e) => setSlug(e.target.value)} />
                    <span className="text-muted-foreground text-sm">.synqed.org</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Team name</Label>
                  <Input id="name" placeholder="My Team" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy || !slug}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4" /> Create team</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
