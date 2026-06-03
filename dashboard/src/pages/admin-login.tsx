import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field } from '@/components/ui/field'
import { Loader2, Shield, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { FullWidthDivider } from '@/components/full-width-divider'
import { setAuthToken, setUser, getUser, validateToken, removeAuthToken } from '@/lib/auth'
import { BOT_API_URL } from '@/lib/config'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const check = async () => {
      const user = getUser()
      if (user?.role === 'admin') {
        const valid = await validateToken()
        if (valid) navigate('/admin')
        else removeAuthToken()
      } else {
        removeAuthToken()
      }
    }
    check()
  }, [navigate])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error('Please enter username and password')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`${BOT_API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json()
      if (data.success && data.token) {
        toast.success('Login successful!')
        setAuthToken(data.token)
        setUser(data.user)
        localStorage.removeItem('adminAuth')
        navigate('/admin')
      } else {
        toast.error(data.error || 'Invalid username or password')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full overflow-hidden px-4 md:h-screen">
      <div className="*:px-6 relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center border-x">
        <div className="flex flex-col space-y-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-3.5" />
            Back to schedule
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md">
              <Shield className="size-5" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl font-semibold tracking-wide">Admin Panel</h1>
              <p className="text-muted-foreground text-sm">Sign in with your administrator account.</p>
            </div>
          </div>
        </div>

        <div className="relative my-6 flex size-full flex-col gap-4 py-8">
          <FullWidthDivider position="top" />
          <form onSubmit={handleLogin} className="space-y-3">
            <Field>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoFocus
              />
            </Field>
            <Field>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            <Button type="submit" size="sm" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
          <FullWidthDivider position="bottom" />
        </div>

        <p className="text-muted-foreground text-center text-sm">
          Use the credentials configured in your bot environment.
        </p>
      </div>
    </div>
  )
}
