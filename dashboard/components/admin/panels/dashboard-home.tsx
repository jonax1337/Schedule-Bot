'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, Calendar, Trophy, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { stagger, microInteractions, cn } from '@/lib/animations';

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

  const statusCards = [
    {
      title: 'Bot Status',
      icon: Activity,
      value: statusLoading ? '...' : isOnline ? 'Running' : 'Offline',
      description: isOnline ? 'Bot is operational' : 'Bot is offline',
      color: statusLoading ? 'muted' : isOnline ? 'green' : 'red',
    },
    {
      title: 'Uptime',
      icon: Clock,
      value: statusLoading ? '...' : formatUptime(botStatus?.uptime),
      description: 'Time since last restart',
      color: 'default',
    },
    {
      title: 'API Server',
      icon: Calendar,
      value: statusLoading ? '...' : isOnline ? 'Online' : 'Offline',
      description: isOnline ? 'API responding' : 'API not responding',
      color: statusLoading ? 'muted' : isOnline ? 'green' : 'red',
    },
    {
      title: 'Discord Connection',
      icon: Users,
      value: statusLoading ? '...' : botStatus?.botReady ? 'Ready' : 'Offline',
      description: botStatus?.botReady ? 'Connected to Discord' : 'Not connected',
      color: statusLoading ? 'muted' : botStatus?.botReady ? 'green' : 'red',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Bot Status Cards with Stagger Animation */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((card, index) => {
          const Icon = card.icon;
          const colorClass =
            card.color === 'green'
              ? 'text-green-600 dark:text-green-400'
              : card.color === 'red'
                ? 'text-red-600 dark:text-red-400'
                : 'text-muted-foreground';

          return (
            <Card
              key={card.title}
              className={cn(
                stagger(index, 'fast', 'slideUpScale'),
                microInteractions.hoverLift
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn('text-2xl font-bold', colorClass)}>
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats Grid with Stagger Animation */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Total Users',
            icon: Users,
            value: loading ? '...' : stats?.totalUsers || 0,
            description: 'Registered team members',
          },
          {
            title: 'Upcoming Schedules',
            icon: Calendar,
            value: loading ? '...' : stats?.upcomingSchedules || 0,
            description: 'Next 14 days',
          },
          {
            title: 'Total Scrims',
            icon: Trophy,
            value: loading ? '...' : stats?.totalScrims || 0,
            description: 'Match history records',
          },
          {
            title: 'Active Schedules',
            icon: Activity,
            value: loading ? '...' : stats?.totalSchedules || 0,
            description: 'Total schedule entries',
          },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={cn(
                stagger(index, 'slow', 'slideUpScale'),
                microInteractions.hoverLift
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions with Stagger Animation */}
      <Card className="animate-slideUp">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: '/admin?tab=users',
              icon: Users,
              title: 'Manage Users',
              description: 'Add or edit team members',
            },
            {
              href: '/admin?tab=schedule',
              icon: Calendar,
              title: 'Edit Schedule',
              description: 'Update schedule reasons',
            },
            {
              href: '/admin?tab=scrims',
              icon: Trophy,
              title: 'View Scrims',
              description: 'Match history & stats',
            },
            {
              href: '/admin?tab=actions',
              icon: Activity,
              title: 'Bot Actions',
              description: 'Trigger manual actions',
            },
            {
              href: '/admin?tab=settings',
              icon: Clock,
              title: 'Settings',
              description: 'Configure bot settings',
            },
            {
              href: '/admin?tab=logs',
              icon: TrendingUp,
              title: 'View Logs',
              description: 'System activity logs',
            },
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <a
                key={action.title}
                href={action.href}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border hover:bg-accent',
                  stagger(index, 'fast', 'fadeIn'),
                  microInteractions.smooth,
                  microInteractions.hoverScaleSm
                )}
              >
                <Icon className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">{action.title}</div>
                  <div className="text-sm text-muted-foreground">{action.description}</div>
                </div>
              </a>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
