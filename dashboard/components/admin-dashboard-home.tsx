'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusCard from '@/components/status-card';
import { Activity, Users, Calendar, Trophy, TrendingUp, Clock } from 'lucide-react';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface DashboardStats {
  totalUsers: number;
  totalSchedules: number;
  totalScrims: number;
  upcomingSchedules: number;
  recentActivity: string[];
}

export default function AdminDashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      
      // Load user mappings
      const usersRes = await fetch(`${BOT_API_URL}/api/user-mappings`, {
        headers: getAuthHeaders(),
      });
      const usersData = await usersRes.json();
      
      // Load schedules
      const schedulesRes = await fetch(`${BOT_API_URL}/api/schedule/next14`, {
        headers: getAuthHeaders(),
      });
      const schedulesData = await schedulesRes.json();
      
      // Load scrims
      const scrimsRes = await fetch(`${BOT_API_URL}/api/scrims`, {
        headers: getAuthHeaders(),
      });
      const scrimsData = await scrimsRes.json();

      setStats({
        totalUsers: usersData.mappings?.length || 0,
        totalSchedules: schedulesData.schedules?.length || 0,
        totalScrims: scrimsData.scrims?.length || 0,
        upcomingSchedules: schedulesData.schedules?.filter((s: any) => {
          const [day, month, year] = s.date.split('.');
          const scheduleDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          return scheduleDate >= new Date();
        }).length || 0,
        recentActivity: [],
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Overview of your Valorant Schedule Bot
        </p>
      </div>

      {/* Bot Status */}
      <StatusCard />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.upcomingSchedules || 0}</div>
            <p className="text-xs text-muted-foreground">
              Next 14 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scrims</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.totalScrims || 0}</div>
            <p className="text-xs text-muted-foreground">
              Match history records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.totalSchedules || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total schedule entries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <a 
            href="/admin?tab=users" 
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <Users className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Manage Users</div>
              <div className="text-sm text-muted-foreground">Add or edit team members</div>
            </div>
          </a>

          <a 
            href="/admin?tab=schedule" 
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Edit Schedule</div>
              <div className="text-sm text-muted-foreground">Update schedule reasons</div>
            </div>
          </a>

          <a 
            href="/admin?tab=scrims" 
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <Trophy className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">View Scrims</div>
              <div className="text-sm text-muted-foreground">Match history & stats</div>
            </div>
          </a>

          <a 
            href="/admin?tab=actions" 
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Bot Actions</div>
              <div className="text-sm text-muted-foreground">Trigger manual actions</div>
            </div>
          </a>

          <a 
            href="/admin?tab=settings" 
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Settings</div>
              <div className="text-sm text-muted-foreground">Configure bot settings</div>
            </div>
          </a>

          <a 
            href="/admin?tab=logs" 
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">View Logs</div>
              <div className="text-sm text-muted-foreground">System activity logs</div>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
