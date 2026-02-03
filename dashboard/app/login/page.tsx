'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from "@/components/auth";
import { toast } from 'sonner';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Import auth helpers
        const { validateToken, removeAuthToken } = await import('@/lib/auth');
        
        // Check if user has a token
        const savedUser = localStorage.getItem('selectedUser');
        const sessionToken = localStorage.getItem('sessionToken');
        
        if (savedUser || sessionToken) {
          // Validate the token with the server
          const isValid = await validateToken();
          
          if (isValid) {
            // Token is valid, redirect to original page or home
            const redirect = searchParams.get('redirect');
            router.push(redirect || '/');
            return;
          } else {
            // Token is invalid, clean up and stay on login page
            removeAuthToken();
            localStorage.removeItem('selectedUser');
            localStorage.removeItem('sessionToken');
            toast.error('Session expired. Please login again.');
          }
        }

        // Check for OAuth callback error
        const error = searchParams.get('error');
        if (error) {
          toast.error(decodeURIComponent(error));
        }
      } catch (e) {
        console.error('Auth check error:', e);
      }
    };
    
    checkAuthAndRedirect();
  }, [router, searchParams]);

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10 overflow-hidden">
      {/* Background gradient decoration */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      <div className="absolute top-0 right-0 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 -z-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

      <div className="w-full max-w-sm animate-scaleIn">
        <LoginForm redirectTo={searchParams.get('redirect')} />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
