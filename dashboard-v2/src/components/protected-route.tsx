import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { getAuthToken, getUser, validateToken } from '@/lib/auth'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'unauth' | 'forbidden'>('checking')

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (!getAuthToken()) {
        if (!cancelled) setStatus('unauth')
        return
      }
      const valid = await validateToken()
      if (cancelled) return
      if (!valid) {
        setStatus('unauth')
        return
      }
      if (requireAdmin && getUser()?.role !== 'admin') {
        setStatus('forbidden')
        return
      }
      setStatus('ok')
    }
    check()
    return () => {
      cancelled = true
    }
  }, [requireAdmin])

  if (status === 'checking') {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    )
  }
  if (status === 'unauth') return <Navigate to={requireAdmin ? '/admin/login' : '/login'} replace />
  if (status === 'forbidden') return <Navigate to="/" replace />
  return <>{children}</>
}
