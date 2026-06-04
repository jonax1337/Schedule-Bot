import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { FullWidthDivider } from '@/components/full-width-divider'
import { setAuthToken, setUser } from '@/lib/auth'
import { BOT_API_URL } from '@/lib/config'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Authenticating with Discord...')

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setMessage(`Authentication failed: ${error}`)
        return
      }
      if (!code || !state) {
        setStatus('error')
        setMessage('Missing authorization code or state')
        return
      }

      try {
        const response = await fetch(`${BOT_API_URL}/api/auth/discord/callback?code=${code}&state=${state}`)
        if (!response.ok) {
          const errorData = await response.json()
          setStatus('error')
          setMessage(errorData.message || 'Authentication failed')
          setTimeout(() => {
            navigate(`/login?error=${encodeURIComponent(errorData.message || 'Authentication failed')}`)
          }, 3000)
          return
        }

        const data = await response.json()
        setAuthToken(data.token)
        setUser(data.user)
        localStorage.setItem('selectedUser', data.user.username)

        setStatus('success')
        setMessage(`Welcome back, ${data.user.username}!`)

        const loginRedirect = localStorage.getItem('loginRedirect')
        if (loginRedirect) localStorage.removeItem('loginRedirect')
        setTimeout(() => navigate(loginRedirect || '/'), 1000)
      } catch (error) {
        console.error('Callback error:', error)
        setStatus('error')
        setMessage('Failed to complete authentication')
        setTimeout(() => navigate('/login?error=Failed to complete authentication'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  const heading =
    status === 'loading' ? 'Authenticating' : status === 'success' ? 'Success' : 'Authentication failed'

  const iconWrapperClass =
    status === 'error'
      ? 'bg-destructive text-destructive-foreground flex size-10 items-center justify-center rounded-md'
      : 'bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md'

  return (
    <div className="relative w-full overflow-hidden px-4 md:h-screen">
      <div className="*:px-6 relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center border-x">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center gap-3">
            <div className={iconWrapperClass}>
              {status === 'loading' && <Loader2 className="size-5 animate-spin" />}
              {status === 'success' && <CheckCircle2 className="size-5" />}
              {status === 'error' && <XCircle className="size-5" />}
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl font-semibold tracking-wide">{heading}</h1>
              <p className="text-muted-foreground text-sm">{message}</p>
            </div>
          </div>
        </div>

        <div className="relative my-6 flex size-full flex-col gap-4 py-8">
          <FullWidthDivider position="top" />
          {status === 'loading' && (
            <p className="text-muted-foreground text-center text-sm">
              Please wait while we verify your Discord account…
            </p>
          )}
          {status === 'success' && (
            <p className="text-muted-foreground text-center text-sm">Redirecting to your dashboard…</p>
          )}
          {status === 'error' && (
            <Button onClick={() => navigate('/login')} variant="outline" size="sm" className="w-full">
              Back to login
            </Button>
          )}
          <FullWidthDivider position="bottom" />
        </div>

        <p className="text-muted-foreground text-center text-sm">
          Connecting your Discord account to Synqed.
        </p>
      </div>
    </div>
  )
}
