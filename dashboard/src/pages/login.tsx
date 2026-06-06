import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { LoginForm } from '@/components/auth/login-form'
import { validateToken, removeAuthToken } from '@/lib/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const check = async () => {
      const savedUser = localStorage.getItem('selectedUser')
      const sessionToken = localStorage.getItem('sessionToken')
      if (savedUser || sessionToken) {
        const valid = await validateToken()
        if (valid) {
          navigate(searchParams.get('redirect') || '/')
          return
        }
        removeAuthToken()
        localStorage.removeItem('selectedUser')
        localStorage.removeItem('sessionToken')
        toast.error('Session expired. Please login again.')
      }
      const error = searchParams.get('error')
      if (error) toast.error(decodeURIComponent(error))
    }
    check()
  }, [navigate, searchParams])

  return <LoginForm />
}
