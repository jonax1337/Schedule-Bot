import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import { setAuthToken, setUser, getAuthHeaders } from '@/lib/auth'
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
        // Echo back the CSRF nonce stashed when the flow started (same-session proof).
        const nonce = sessionStorage.getItem('synqed_oauth_nonce') || ''
        sessionStorage.removeItem('synqed_oauth_nonce')
        const response = await fetch(
          `${BOT_API_URL}/api/auth/discord/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&nonce=${encodeURIComponent(nonce)}`,
          { headers: getAuthHeaders() },
        )
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
    <AuthShell tagline="Almost there." subline="Hang tight — we're completing your Discord sign-in.">
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

      {status === 'success' && (
        <p className="text-muted-foreground text-sm">Redirecting to your dashboard…</p>
      )}
      {status === 'error' && (
        <Button onClick={() => navigate('/login')} variant="outline" size="sm" className="w-full">
          Back to login
        </Button>
      )}
    </AuthShell>
  )
}
