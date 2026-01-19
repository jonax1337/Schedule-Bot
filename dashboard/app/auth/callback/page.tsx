'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

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
        
        // Store session token and username
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem('selectedUser', data.user.username);

        setStatus('success');
        setMessage(`Welcome back, ${data.user.username}!`);

        // Redirect to dashboard after 1 second
        setTimeout(() => {
          router.push('/');
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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
              {status === 'loading' && 'Authenticating'}
              {status === 'success' && 'Success'}
              {status === 'error' && 'Authentication Failed'}
            </CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'loading' && (
              <p className="text-center text-sm text-muted-foreground">
                Please wait while we verify your Discord account...
              </p>
            )}
            {status === 'error' && (
              <Button 
                onClick={() => router.push('/login')} 
                variant="outline" 
                className="w-full"
              >
                Back to Login
              </Button>
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading
            </CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
