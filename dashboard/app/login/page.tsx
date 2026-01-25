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
            // Token is valid, redirect to home
            router.push('/');
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
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
