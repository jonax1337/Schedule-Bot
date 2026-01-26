'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  UserLayoutWrapper,
  UserScheduleContent,
  UserAvailabilityContent,
  UserMatchesContent
} from '@/components/user';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'schedule';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { validateToken, removeAuthToken } = await import('@/lib/auth');
        
        const user = localStorage.getItem('selectedUser');
        
        if (!user) {
          router.replace('/login');
          return;
        }
        
        const isValid = await validateToken();
        
        if (!isValid) {
          removeAuthToken();
          localStorage.removeItem('selectedUser');
          localStorage.removeItem('sessionToken');
          router.replace('/login');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const titles: Record<string, string> = {
      schedule: 'Team Calendar',
      availability: 'My Availability',
      matches: 'Match History',
    };
    
    const pageTitle = titles[currentTab] || 'Team Calendar';
    document.title = `${pageTitle} - Valorant Schedule Bot`;
  }, [currentTab]);

  return (
    <UserLayoutWrapper>
      <div className="animate-fadeIn">
        {currentTab === 'schedule' && <UserScheduleContent />}
        {currentTab === 'availability' && <UserAvailabilityContent />}
        {currentTab === 'matches' && <UserMatchesContent />}
      </div>
    </UserLayoutWrapper>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-scaleIn">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
