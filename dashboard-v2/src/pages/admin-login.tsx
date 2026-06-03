import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Shield, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
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
    <div className="flex min-h-svh w-full flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Schedule
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="bg-primary text-primary-foreground mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl shadow-sm">
              <Shield className="h-6 w-6" />
            </div>
            <CardTitle>Admin Dashboard</CardTitle>
            <CardDescription>Enter your credentials to access the admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    autoComplete="username"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </Field>
                <Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
