'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, Calendar, Trophy, TrendingUp, Clock, Loader2 } from 'lucide-react';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface DashboardStats {
  totalUsers: number;
  totalSchedules: number;
  totalScrims: number;
  upcomingSchedules: number;
  recentActivity: string[];
}

interface BotStatus {
  status: 'running' | 'offline';
  botReady: boolean;
  uptime?: number;
}

export default function AdminDashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    loadStats();
    checkBotStatus();
    const interval = setInterval(checkBotStatus, 10000); // Check bot status every 10 seconds
    return () => clearInterval(interval);
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

  const checkBotStatus = async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/api/bot-status`);
      const data = await response.json();
      setBotStatus(data);
      setStatusLoading(false);
    } catch (error) {
      setBotStatus({ status: 'offline', botReady: false });
      setStatusLoading(false);
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const isOnline = botStatus && botStatus.status === 'running' && botStatus.botReady;

  return (
    <div className="space-y-6">
      {/* Bot Status Cards */}
      {statusLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="invisible">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium flex items-center justify-center text-muted-foreground">
                  <Activity className="mr-2 h-4 w-4" />
                  Placeholder
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center pt-0 pb-4">
                <div className="text-2xl font-bold">
                  00h 00m
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Status Card */}
          <Card className="animate-slideUp stagger-1">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium flex items-center justify-center text-muted-foreground">
                <Activity className="mr-2 h-4 w-4" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pt-0 pb-4">
              {isOnline ? (
                <Badge className="bg-green-500 hover:bg-green-600 text-base px-4 py-1">
                  ● Running
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-base px-4 py-1">
                  ● Offline
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Uptime Card */}
          <Card className="animate-slideUp stagger-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium flex items-center justify-center text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pt-0 pb-4">
              <div className="text-2xl font-bold">
                {formatUptime(botStatus?.uptime)}
              </div>
            </CardContent>
          </Card>

          {/* API Server Card */}
          <Card className="animate-slideUp stagger-3">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium flex items-center justify-center text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4" />
                API Server
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pt-0 pb-4">
              {isOnline ? (
                <div
                  className="text-2xl font-bold text-green-600 dark:text-green-400 cursor-help"
                  title={process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001'}
                >
                  Online
                </div>
              ) : (
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">Offline</div>
              )}
            </CardContent>
          </Card>

          {/* Connection Card */}
          <Card className="animate-slideUp stagger-4">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium flex items-center justify-center text-muted-foreground">
                <Users className="mr-2 h-4 w-4" />
                Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pt-0 pb-4">
              {botStatus?.botReady ? (
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">Ready</div>
              ) : (
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">Offline</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
