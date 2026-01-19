'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-md">
        <div className="flex items-center justify-end mb-6 animate-slideDown">
          <ThemeToggle />
        </div>

        <Card className="animate-scaleIn">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
              {status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
              {status === 'loading' && 'Authenticating...'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Authentication Failed'}
            </CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'loading' && (
              <div className="text-center text-sm text-muted-foreground">
                Please wait while we verify your Discord account...
              </div>
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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 max-w-md">
          <div className="flex items-center justify-end mb-6">
            <ThemeToggle />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
