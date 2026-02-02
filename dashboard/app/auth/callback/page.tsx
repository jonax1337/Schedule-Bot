'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { microInteractions } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { BOT_API_URL } from '@/lib/config';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Authenticating with Discord...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Authentication failed: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authorization code or state');
        return;
      }

      try {
        const response = await fetch(
          `${BOT_API_URL}/api/auth/discord/callback?code=${code}&state=${state}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          setStatus('error');
          setMessage(errorData.message || 'Authentication failed');
          
          // Redirect to login with error after 3 seconds
          setTimeout(() => {
            router.push(`/login?error=${encodeURIComponent(errorData.message || 'Authentication failed')}`);
          }, 3000);
          return;
        }

        const data = await response.json();
        
        // Import auth helpers
        const { setAuthToken, setUser } = await import('@/lib/auth');
        
        // Store JWT token and user info
        setAuthToken(data.token);
        setUser(data.user);
        
        // Also keep selectedUser for backwards compatibility
        localStorage.setItem('selectedUser', data.user.username);

        setStatus('success');
        setMessage(`Welcome back, ${data.user.username}!`);

        // Redirect to original page or dashboard after 1 second
        const loginRedirect = localStorage.getItem('loginRedirect');
        if (loginRedirect) localStorage.removeItem('loginRedirect');
        setTimeout(() => {
          router.push(loginRedirect || '/');
        }, 1000);
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage('Failed to complete authentication');
        
        setTimeout(() => {
          router.push('/login?error=Failed to complete authentication');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="animate-scaleIn">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 animate-fadeIn stagger-1">
              {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
              {status === 'success' && <CheckCircle2 className="h-6 w-6 text-primary animate-scaleIn" />}
              {status === 'error' && <XCircle className="h-6 w-6 text-red-500 animate-shake" />}
            </div>
            <CardTitle className="animate-fadeIn stagger-2">
              {status === 'loading' && 'Authenticating'}
              {status === 'success' && 'Success'}
              {status === 'error' && 'Authentication Failed'}
            </CardTitle>
            <CardDescription className="animate-fadeIn stagger-3">{message}</CardDescription>
          </CardHeader>
          <CardContent className="animate-fadeIn stagger-4">
            {status === 'loading' && (
              <p className="text-center text-sm text-muted-foreground">
                Please wait while we verify your Discord account...
              </p>
            )}
            {status === 'error' && (
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className={cn("w-full", microInteractions.activePress)}
              >
                Back to Login
              </Button>
            )}
            {status === 'success' && (
              <p className="text-center text-sm text-muted-foreground">
                Redirecting to dashboard...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card className="animate-scaleIn">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <CardTitle>Loading</CardTitle>
              <CardDescription>Please wait...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
