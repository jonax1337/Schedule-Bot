'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { setAuthToken, setUser } from '@/lib/auth';
import { microInteractions } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { BOT_API_URL } from '@/lib/config';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const { validateToken, removeAuthToken, getUser } = await import('@/lib/auth');
        const user = getUser();
        
        // If user exists and is admin, validate token
        if (user?.role === 'admin') {
          const isValid = await validateToken();
          
          if (isValid) {
            // Valid admin token, redirect to admin panel
            router.push('/admin');
          } else {
            // Invalid token, clean up
            removeAuthToken();
          }
        } else {
          // Not admin or no user, clean up any stale tokens
          removeAuthToken();
        }
      } catch (e) {
        console.error('Auth check error:', e);
      }
    };
    
    checkExistingAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BOT_API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        toast.success('Login successful!');
        
        // Store JWT token and user info
        setAuthToken(data.token);
        setUser(data.user);
        
        // Remove old auth flag if exists
        localStorage.removeItem('adminAuth');
        
        router.push('/admin');
      } else {
        toast.error(data.error || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          className={cn(
            "mb-4 animate-slideDown",
            microInteractions.smooth,
            microInteractions.hoverScaleSm
          )}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Schedule
        </Button>

        <Card className="animate-scaleIn">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 animate-fadeIn stagger-1">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="animate-fadeIn stagger-2">Admin Dashboard</CardTitle>
            <CardDescription className="animate-fadeIn stagger-3">
              Enter your credentials to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="animate-fadeIn stagger-4">
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
                    className={microInteractions.focusRing}
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
                    className={microInteractions.focusRing}
                  />
                </Field>
                <Field>
                  <Button
                    type="submit"
                    className={cn("w-full", microInteractions.activePress)}
                    disabled={loading}
                  >
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
  );
}
