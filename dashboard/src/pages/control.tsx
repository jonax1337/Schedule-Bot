import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SynqedMark, Wordmark } from '@/components/synqed-brand'
import { AuthShell } from '@/components/auth/auth-shell'
import { AuthDivider } from '@/components/auth-divider'
import { Loader2, Plus, ArrowRight, LogOut, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { BOT_API_URL } from '@/lib/config'
import { getAuthToken, getUser, setAuthToken, setUser, removeAuthToken, startDiscordLogin } from '@/lib/auth'
import { subdomainUrl } from '@/lib/tenant'

interface Org {
  slug: string
  name: string
  /** Access role (OWNER/ADMIN/MANAGER/MEMBER) or roster position (MAIN/SUB/COACH). */
  role: string
  kind?: 'member' | 'roster'
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
  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Org | null>(null)
  const [renameName, setRenameName] = useState('')
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
      setCreateOpen(false)
      loadOrgs(token)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create team')
    } finally {
      setBusy(false)
    }
  }

  function startRename(o: Org) {
    setRenameTarget(o)
    setRenameName(o.name)
  }

  async function renameTeam(e: FormEvent) {
    e.preventDefault()
    if (!token || !renameTarget) return
    setBusy(true)
    try {
      const res = await fetch(`${BOT_API_URL}/api/platform/organizations/${renameTarget.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: renameName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not rename team')
      toast.success(`Renamed to "${data.organization.name}"`)
      setRenameTarget(null)
      loadOrgs(token)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not rename team')
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

  // --- Signed out: premium split-screen via the shared AuthShell ---
  if (!token) {
    return (
      <AuthShell tagline="Run your team like a pro.">
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl font-bold tracking-wide">
            Welcome to <Wordmark />
          </h1>
          <p className="text-muted-foreground text-base">Sign in to manage your teams.</p>
        </div>

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

        <p className="text-muted-foreground text-xs">
          Sign in with Discord — the same account works across all your teams.
        </p>
      </AuthShell>
    )
  }

  // --- Signed in: premium teams hub ---
  const accountInitial = (accountName?.charAt(0) ?? '?').toUpperCase()
  return (
    <div className="bg-background relative min-h-screen">
      <div aria-hidden className="absolute inset-0 isolate -z-10 opacity-60 contain-strict">
        <div className="absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.05)_0,transparent_80%)]" />
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SynqedMark className="text-foreground size-7" />
            <div>
              <Wordmark className="text-xl" />
              <div className="text-muted-foreground text-xs">Control plane</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{accountInitial}</AvatarFallback>
            </Avatar>
            {accountName && <span className="text-muted-foreground hidden text-sm sm:inline">{accountName}</span>}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </header>

        <div className="mt-12 mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Your teams</h1>
          <p className="text-muted-foreground text-sm">Open a team to manage it, or spin up a new one.</p>
        </div>

        {orgs === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {orgs.map((o) => (
              <div
                key={o.slug}
                className="group bg-card hover:border-primary/40 relative flex flex-col gap-4 rounded-xl border p-5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="size-11 rounded-lg">
                    <AvatarFallback className="bg-primary text-primary-foreground rounded-lg text-base font-semibold">
                      {o.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold">{o.name}</span>
                      {(o.role === 'OWNER' || o.role === 'ADMIN') && (
                        <button
                          type="button"
                          onClick={() => startRename(o)}
                          aria-label="Rename team"
                          className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">{o.slug}.synqed.org</div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {o.role.toLowerCase()}
                  </Badge>
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <Button size="sm" className="flex-1" onClick={() => openTeam(o.slug)}>
                    Open <ArrowRight className="size-4" />
                  </Button>
                  {(o.role === 'OWNER' || o.role === 'ADMIN') && (
                    <Button size="sm" variant="outline" onClick={() => connectDiscord(o.slug)}>
                      Connect Discord
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="text-muted-foreground hover:border-primary/40 hover:text-foreground flex min-h-[9.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-colors"
            >
              <Plus className="size-6" />
              <span className="text-sm font-medium">Create a team</span>
            </button>
          </div>
        )}
      </div>

      <Dialog open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Rename team</DialogTitle>
            <DialogDescription>
              The display name for <span className="font-medium">{renameTarget?.slug}.synqed.org</span>. The
              subdomain stays the same.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={renameTeam} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rename">Team name</Label>
              <Input
                id="rename"
                placeholder="My Team"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy || !renameName.trim()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Create a team</DialogTitle>
            <DialogDescription>Each team gets its own subdomain and Discord connection.</DialogDescription>
          </DialogHeader>
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
            <DialogFooter>
              <Button type="submit" disabled={busy || !slug}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : (<><Plus className="size-4" /> Create team</>)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
