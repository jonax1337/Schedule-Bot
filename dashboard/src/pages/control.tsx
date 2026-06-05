import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { BOT_API_URL } from '@/lib/config'
import { getAuthToken, setAuthToken, setUser, removeAuthToken, withAuthHandoff } from '@/lib/auth'
import { subdomainUrl } from '@/lib/tenant'

interface Org {
  slug: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}

/**
 * Control plane (`/control`): the SaaS layer. Sign in (Discord, or local dev
 * login), see the teams you belong to, and create a new team. Deliberately
 * minimal — this is the MVP, not the marketing site.
 */
export function ControlPage() {
  const [token, setToken] = useState<string | null>(getAuthToken())
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const [devName, setDevName] = useState('')
  const [slug, setSlug] = useState('')
  const [teamName, setTeamName] = useState('')
  const [busy, setBusy] = useState(false)

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
      const res = await fetch(`${BOT_API_URL}/api/auth/discord`)
      if (!res.ok) throw new Error((await res.json()).message || 'Discord login unavailable')
      window.location.href = (await res.json()).url
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
    // Open the team on its own subdomain, carrying the login across origins.
    window.location.href = withAuthHandoff(subdomainUrl(s, '/'))
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

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Synqed — Control Plane</h1>
        <p className="text-muted-foreground text-sm">Sign in and manage your teams.</p>
      </div>

      {!token ? (
        <div className="space-y-4 rounded-lg border p-5">
          <Button type="button" className="w-full" onClick={discordLogin}>
            Continue with Discord
          </Button>
          {import.meta.env.DEV && (
            <>
              <div className="text-muted-foreground text-center text-xs">— or local dev login —</div>
              <form onSubmit={devLogin} className="flex gap-2">
                <Input placeholder="Your name" value={devName} onChange={(e) => setDevName(e.target.value)} />
                <Button type="submit" variant="secondary" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : 'Dev login'}
                </Button>
              </form>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2 rounded-lg border p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Your teams</h2>
              <button onClick={signOut} className="text-muted-foreground hover:text-foreground text-xs underline">
                Sign out
              </button>
            </div>
            {orgs === null ? (
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            ) : orgs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No teams yet — create your first one below.</p>
            ) : (
              <ul className="divide-y">
                {orgs.map((o) => (
                  <li key={o.slug} className="flex items-center justify-between py-2">
                    <span>
                      <span className="font-medium">{o.name}</span>{' '}
                      <span className="text-muted-foreground text-xs">{o.slug} · {o.role.toLowerCase()}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => connectDiscord(o.slug)}>
                        Connect Discord
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openTeam(o.slug)}>
                        Open <ArrowRight className="size-4" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={createTeam} className="space-y-3 rounded-lg border p-5">
            <h2 className="font-medium">Create a team</h2>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Subdomain</Label>
              <div className="flex items-center gap-1">
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
        </div>
      )}
    </div>
  )
}
