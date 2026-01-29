'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Settings,
  Actions,
  Logs,
  UserMappings,
  ScheduleEditor,
  Matches,
  Security,
  AdminDashboard,
  Statistics,
  MapVetoPlanner,
  Stratbook
} from "@/components/admin/pages";
import { AdminLayoutWrapper } from "@/components/admin/layout";
import { Loader2 } from "lucide-react";

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    // Check for JWT token and admin role
    const checkAuth = async () => {
      const { validateToken, removeAuthToken, getUser } = await import('@/lib/auth');

      const user = getUser();
      if (!user || user.role !== 'admin') {
        removeAuthToken();
        router.push('/admin/login');
        return;
      }

      // Validate the token with the server
      const isValid = await validateToken();

      if (!isValid) {
        // Token is invalid, clean up and redirect to login
        removeAuthToken();
        router.push('/admin/login');
        return;
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      statistics: 'Statistics',
      settings: 'Settings',
      users: 'User Management',
      schedule: 'Schedule Editor',
      scrims: 'Match Management',
      'map-veto': 'Map Veto Planner',
      stratbook: 'Stratbook',
      actions: 'Bot Actions',
      security: 'Security',
      logs: 'Logs',
    };

    const pageTitle = titles[currentTab] || 'Dashboard';
    document.title = `${pageTitle} - Admin Panel`;
  }, [currentTab]);

  return (
    <AdminLayoutWrapper>
      <div className="animate-fadeIn">
        {currentTab === 'dashboard' && <AdminDashboard />}
        {currentTab === 'statistics' && <Statistics />}
        {currentTab === 'settings' && <Settings />}
        {currentTab === 'users' && <UserMappings />}
        {currentTab === 'schedule' && <ScheduleEditor />}
        {currentTab === 'scrims' && <Matches />}
        {currentTab === 'map-veto' && <MapVetoPlanner />}
        {currentTab === 'stratbook' && <Stratbook />}
        {currentTab === 'actions' && <Actions />}
        {currentTab === 'security' && <Security />}
        {currentTab === 'logs' && <Logs />}
      </div>
    </AdminLayoutWrapper>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}
